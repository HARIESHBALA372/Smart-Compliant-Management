/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, UserX, UserCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUsers, createUser, updateUser, deleteUser } from '@/store/slices/userSlice'
import { useToast } from '@/hooks/useToast'
import type { User, Role as UserRole } from '@/types'
import { Role } from '@/types'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { Pagination } from '@/components/common/Pagination'
import { SearchBar } from '@/components/common/SearchBar'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { TableRowSkeleton } from '@/components/common/Skeleton'
import { getInitials, formatDate } from '@/utils'

const roleOptions = [
  { value: Role.CUSTOMER, label: 'Customer' },
  { value: Role.AGENT, label: 'Support Agent' },
  { value: Role.MANAGER, label: 'Manager' },
  { value: Role.ADMIN, label: 'Administrator' },
]

function getRoleBadge(role: string) {
  switch (role) {
    case Role.ADMIN:
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case Role.MANAGER:
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case Role.AGENT:
      return 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    default:
      return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
  }
}

export function UserManagementPage() {
  const dispatch = useAppDispatch()
  const { users, total, page, totalPages, isLoading } = useAppSelector((state) => state.users)
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: Role.CUSTOMER, password: '' })

  useEffect(() => {
    dispatch(fetchUsers({ search: search || undefined, role: roleFilter || undefined }))
  }, [dispatch, search, roleFilter])

  const filtered = users.filter((u) => {
    if (statusFilter === 'active' && !u.isActive) return false
    if (statusFilter === 'inactive' && u.isActive) return false
    return true
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', email: '', phone: '', role: Role.CUSTOMER, password: '' })
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setForm({ name: user.name, email: user.email, phone: user.phone || '', role: user.role, password: '' })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      showToast({ type: 'warning', message: 'Name and email are required' })
      return
    }
    if (editing) {
      dispatch(updateUser({ id: editing.id, data: { name: form.name, email: form.email, phone: form.phone, role: form.role as UserRole } }))
      showToast({ type: 'success', message: 'User updated' })
    } else {
      dispatch(createUser({ ...form, role: form.role as UserRole }))
      showToast({ type: 'success', message: 'User created' })
    }
    setModalOpen(false)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    dispatch(deleteUser(deleteTarget.id))
    showToast({ type: 'success', message: 'User deleted' })
    setDeleteTarget(null)
  }

  const toggleActive = (user: User) => {
    dispatch(updateUser({ id: user.id, data: { isActive: !user.isActive } }))
    showToast({ type: 'success', message: user.isActive ? 'User disabled' : 'User enabled' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage users, roles, and access</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Create User
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-xs"
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="agent">Support Agent</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrator</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-xs"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <Table>
          <TableHead>
            <TableHeader>User</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Role</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Created</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
            ) : filtered.length ? (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center font-semibold text-blue-700 dark:text-blue-300 text-xs">
                        {getInitials(user.name)}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(user)} aria-label={user.isActive ? `Disable ${user.name}` : `Enable ${user.name}`}>
                        {user.isActive ? <UserX className="h-4 w-4 text-orange-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(user)} aria-label={`Delete ${user.name}`}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="No users found" description="Try adjusting your search or filters." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Showing {filtered.length} of {total} users</p>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => dispatch(fetchUsers({ page: p }))} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Create User'}>
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          {!editing && (
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          )}
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            options={roleOptions}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}