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
import type { Category } from '@/types'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { Modal } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageSpinner } from '@/components/common/Spinner'

export function CategoriesPage() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', slaResponseHours: '4', slaResolutionHours: '24', subcategories: '' })

  const load = async () => {
    const data = await adminApi.getCategories()
    setCategories(data)
    setIsLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    adminApi.getCategories().then((data) => {
      if (cancelled) return
      setCategories(data)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', slaResponseHours: '4', slaResolutionHours: '24', subcategories: '' })
    setModalOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({
      name: cat.name,
      slaResponseHours: String(cat.slaResponseHours ?? 4),
      slaResolutionHours: String(cat.slaResolutionHours ?? 24),
      subcategories: (cat.subcategories || []).join(', '),
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast({ type: 'warning', message: 'Category name is required' })
      return
    }
    if (editing) {
      await adminApi.updateCategory(editing.id, {
        name: form.name,
        slaResponseHours: Number(form.slaResponseHours),
        slaResolutionHours: Number(form.slaResolutionHours),
        subcategories: form.subcategories.split(',').map((s) => s.trim()).filter(Boolean),
      })
      showToast({ type: 'success', message: 'Category updated' })
    } else {
      await adminApi.createCategory({
        name: form.name,
        slaResponseHours: Number(form.slaResponseHours),
        slaResolutionHours: Number(form.slaResolutionHours),
      })
      showToast({ type: 'success', message: 'Category created' })
    }
    setModalOpen(false)
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await adminApi.deleteCategory(deleteTarget.id)
    showToast({ type: 'success', message: 'Category deleted' })
    setDeleteTarget(null)
    load()
  }

  const toggleActive = async (cat: Category) => {
    await adminApi.updateCategory(cat.id, { ...cat, isActive: !cat.isActive })
    showToast({ type: 'success', message: cat.isActive ? `${cat.name} disabled` : `${cat.name} enabled` })
    load()
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure complaint categories and SLA defaults</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </div>

      <Card>
        {categories.length ? (
          <Table>
            <TableHead>
              <TableHeader>Name</TableHeader>
              <TableHeader>Subcategories</TableHeader>
              <TableHeader>SLA Response</TableHeader>
              <TableHeader>SLA Resolution</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <span className="text-xs text-gray-500">{(cat.subcategories || []).join(', ') || '—'}</span>
                  </TableCell>
                  <TableCell>{cat.slaResponseHours}h</TableCell>
                  <TableCell>{cat.slaResolutionHours}h</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(cat)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        cat.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(cat)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No categories" description="Create your first category to get started." />
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Category' : 'Add Category'}
      >
        <div className="space-y-4">
          <Input label="Category Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Billing" />
          <Input
            label="Subcategories (comma separated)"
            value={form.subcategories}
            onChange={(e) => setForm({ ...form, subcategories: e.target.value })}
            placeholder="Refund, Overcharge, Invoice"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="SLA Response (hours)" type="number" value={form.slaResponseHours} onChange={(e) => setForm({ ...form, slaResponseHours: e.target.value })} />
            <Input label="SLA Resolution (hours)" type="number" value={form.slaResolutionHours} onChange={(e) => setForm({ ...form, slaResolutionHours: e.target.value })} />
          </div>
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
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}