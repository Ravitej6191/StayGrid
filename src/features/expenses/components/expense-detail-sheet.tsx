import { Pencil, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { expenseCategoryOptions, type Expense } from '../types'

interface ExpenseDetailSheetProps {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseDetailSheet({ expense, open, onOpenChange, onEdit, onDelete }: ExpenseDetailSheetProps) {
  if (!expense) return null

  const categoryLabel = expenseCategoryOptions.find((o) => o.value === expense.category)?.label ?? expense.category

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="pb-2">
          <SheetTitle>{categoryLabel}</SheetTitle>
          <p className="text-xs text-muted-foreground">{formatDateTime(expense.createdAt)}</p>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-numeric text-2xl font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
          </div>

          {expense.description ? (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm font-medium text-foreground">{expense.description}</p>
            </div>
          ) : null}

          {expense.imageUrls.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Photos ({expense.imageUrls.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {expense.imageUrls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={`Receipt ${i + 1}`}
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button variant="outline" className="flex-1 text-danger hover:text-danger" onClick={onDelete}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
