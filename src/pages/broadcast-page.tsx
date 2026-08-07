import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { sendBroadcast } from '@/features/broadcast/services/broadcast.service'
import { uploadTenantFile } from '@/lib/storage'
import type { Tenant } from '@/types/domain'
import { usePageTitle } from '@/hooks/use-page-title'

const broadcastSchema = z.object({
  message: z.string().min(2, 'Enter a message'),
  audience: z.string().min(1),
})

type BroadcastFormValues = z.infer<typeof broadcastSchema>

export function BroadcastPage() {
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('Broadcast a Message', onBack)

  const { data: building } = useBuildingData()
  const queryClient = useQueryClient()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setImageFile(file)
    setImagePreview(objectUrl)
  }

  const handleRemoveImage = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setImageFile(null)
    setImagePreview(null)
  }

  const allTenants = useMemo(() => {
    const list: (Tenant & { floorId: string })[] = []
    for (const floor of building?.floors ?? []) {
      for (const house of floor.houses) {
        if (house.tenant) list.push({ ...house.tenant, floorId: floor.id })
      }
    }
    return list
  }, [building])

  const audienceGroups = useMemo(() => {
    const general = [
      { value: 'all', label: 'All Tenants' },
      { value: 'pending_rent', label: 'Pending Rent' },
      { value: 'pending_deposit', label: 'Pending Deposit' },
    ]
    const floors = (building?.floors ?? []).map((f) => ({ value: `floor:${f.id}`, label: f.name }))
    const houses = (building?.floors ?? []).flatMap((f) =>
      f.houses.map((h) => ({ value: `house:${h.id}`, label: `${f.name} · House ${h.houseNumber}` })),
    )
    return { general, floors, houses }
  }, [building])

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { message: '', audience: 'all' },
  })

  const resolveRecipients = (audience: string): { phones: string[]; label: string } => {
    if (audience === 'all') {
      return { phones: allTenants.map((t) => t.phone), label: 'All Tenants' }
    }
    if (audience === 'pending_rent') {
      return {
        phones: allTenants.filter((t) => t.rentStatus !== 'paid').map((t) => t.phone),
        label: 'Pending Rent',
      }
    }
    if (audience === 'pending_deposit') {
      return {
        phones: allTenants.filter((t) => !t.depositRecord).map((t) => t.phone),
        label: 'Pending Deposit',
      }
    }
    if (audience.startsWith('floor:')) {
      const floorId = audience.slice('floor:'.length)
      const floor = building?.floors.find((f) => f.id === floorId)
      return {
        phones: allTenants.filter((t) => t.floorId === floorId).map((t) => t.phone),
        label: floor?.name ?? 'Floor',
      }
    }
    if (audience.startsWith('house:')) {
      const houseId = audience.slice('house:'.length)
      return {
        phones: allTenants.filter((t) => t.houseId === houseId).map((t) => t.phone),
        label: allTenants.find((t) => t.houseId === houseId)
          ? `House ${allTenants.find((t) => t.houseId === houseId)?.houseNumber}`
          : 'House',
      }
    }
    return { phones: [], label: 'Unknown' }
  }

  const mutation = useMutation({
    mutationFn: sendBroadcast,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (result.recipientCount === 0) {
        toast.warning('No tenants matched this audience — nothing was sent.')
      } else if (result.deliveredCount === result.recipientCount) {
        toast.success(`Sent to ${result.deliveredCount} tenant${result.deliveredCount === 1 ? '' : 's'}`)
      } else {
        toast.warning(`Delivered to ${result.deliveredCount}/${result.recipientCount} — some numbers failed`)
      }
      reset()
      handleRemoveImage()
      navigate(-1)
    },
    onError: () => toast.error('Could not send the broadcast. Please try again.'),
  })

  const onSubmit = async (values: BroadcastFormValues) => {
    let imageUrl = imageFile ? null : imagePreview
    if (imageFile) {
      setIsUploadingImage(true)
      try {
        imageUrl = await uploadTenantFile(imageFile, 'broadcast-images')
      } catch {
        toast.error('Could not upload the image. Please try again.')
        setIsUploadingImage(false)
        return
      }
      setIsUploadingImage(false)
    }
    const { phones, label } = resolveRecipients(values.audience)
    mutation.mutate({ message: values.message, imageUrl, audience: label, recipients: phones })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
      <div className="space-y-1.5">
        <Label>Audience</Label>
        <Controller
          name="audience"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {audienceGroups.general.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {audienceGroups.floors.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>By Floor</SelectLabel>
                    {audienceGroups.floors.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                {audienceGroups.houses.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>By House</SelectLabel>
                    {audienceGroups.houses.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" rows={5} placeholder="Write your message..." {...register('message')} />
        {errors.message ? <p className="text-xs text-danger">{errors.message.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label>Image (optional)</Label>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        {imagePreview ? (
          <div className="relative w-fit">
            <img src={imagePreview} alt="Broadcast attachment" className="h-32 rounded-lg border border-border/70 object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              aria-label="Remove image"
              className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-sm"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 py-4 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <Camera className="size-4" />
              Take Photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 py-4 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <ImagePlus className="size-4" />
              Upload Image
            </button>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending || isUploadingImage}>
        {mutation.isPending || isUploadingImage ? <Loader2 className="size-4 animate-spin" /> : null}
        Send Broadcast
      </Button>
    </form>
  )
}
