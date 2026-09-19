import json
import asyncio
from typing import Dict, Set, Any
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        # userId -> Set of WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)

    async def disconnect(self, user_id: str, websocket: WebSocket):
        async with self._lock:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        message_json = json.dumps(message, default=str)
        dead_sockets = set()
        sockets = self.active_connections.get(user_id, set()).copy()
        for ws in sockets:
            try:
                await ws.send_text(message_json)
            except Exception:
                dead_sockets.add(ws)

        if dead_sockets:
            async with self._lock:
                for ws in dead_sockets:
                    self.active_connections.get(user_id, set()).discard(ws)

    async def broadcast(self, message: Dict[str, Any]):
        message_json = json.dumps(message, default=str)
        dead_pairs = []
        for user_id, sockets in list(self.active_connections.items()):
            for ws in list(sockets):
                try:
                    await ws.send_text(message_json)
                except Exception:
                    dead_pairs.append((user_id, ws))

        if dead_pairs:
            async with self._lock:
                for user_id, ws in dead_pairs:
                    if user_id in self.active_connections:
                        self.active_connections[user_id].discard(ws)

    async def notify_user(self, user_id: str, notification: Dict[str, Any]):
        await self.send_to_user(user_id, {
            "type": "notification",
            "payload": notification,
        })

    async def notify_analytics_update(self):
        await self.broadcast({
            "type": "analytics",
            "payload": {},
        })

ws_manager = WebSocketManager()
