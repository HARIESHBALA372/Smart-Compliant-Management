/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { adminApi } from '@/services/adminApi'
import type { Department } from '@/types'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { Modal } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageSpinner } from '@/components/common/Spinner'

export function AdminDepartmentsPage() {
  const { showToast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)
  const [form, setForm] = useState({ name: '', description: '', contactEmail: '', contactPhone: '' })

  const load = async () => {
    try {
      const data = await adminApi.getDepartments()
      setDepartments(data)
    } catch {
      showToast({ type: 'error', message: 'Failed to load departments' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    adminApi.getDepartments().then((data) => {
      if (cancelled) return
      setDepartments(data)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', contactEmail: '', contactPhone: '' })
    setModalOpen(true)
  }

  const openEdit = (dept: Department) => {
    setEditing(dept)
    setForm({ name: dept.name, description: dept.description || '', contactEmail: dept.contactEmail || '', contactPhone: dept.contactPhone || '' })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast({ type: 'warning', message: 'Department name is required' })
      return
    }
    try {
      if (editing) {
        await adminApi.updateDepartment(editing.id, form)
        showToast({ type: 'success', message: 'Department updated' })
      } else {
        await adminApi.createDepartment(form)
        showToast({ type: 'success', message: 'Department created' })
      }
      setModalOpen(false)
      load()
    } catch {
      showToast({ type: 'error', message: 'Failed to save department' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.deleteDepartment(deleteTarget.id)
      showToast({ type: 'success', message: 'Department deleted' })
      setDeleteTarget(null)
      load()
    } catch {
      showToast({ type: 'error', message: 'Failed to delete department' })
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage organizational departments</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Department
        </Button>
      </div>

      <Card>
        {departments.length ? (
          <Table>
            <TableHead>
              <TableHeader>Name</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Contact Email</TableHeader>
              <TableHeader>Contact Phone</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="max-w-[200px] text-sm text-gray-500">{dept.description || '—'}</TableCell>
                  <TableCell className="text-sm">{dept.contactEmail || '—'}</TableCell>
                  <TableCell className="text-sm">{dept.contactPhone || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(dept)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(dept)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No departments" description="Create your first department to get started." />
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'Add Department'}>
        <div className="space-y-4">
          <Input label="Department Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Customer Support" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="dept@example.com" />
            <Input label="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+1-555-0100" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
