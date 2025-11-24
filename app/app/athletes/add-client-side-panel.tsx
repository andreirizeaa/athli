"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { SidePanel } from "@/components/app/side-panel"
import { cn } from "@/lib/utils"

const addAthleteSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  coachingType: z.union([z.literal("online"), z.literal("in-person")]),
})

type AddAthleteFormValues = z.infer<typeof addAthleteSchema>

interface AddClientSidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AddClientSidePanel = ({ open, onOpenChange }: AddClientSidePanelProps) => {
  const form = useForm<AddAthleteFormValues>({
    resolver: zodResolver(addAthleteSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      coachingType: "online",
    },
  })

  const handleSubmitInvitation = async (values: AddAthleteFormValues) => {
    // Handle form submission here
    console.log("Form values:", values)
    onOpenChange(false)
    form.reset()
    toast.success("Invitation sent successfully", {
      description: `An invitation has been sent to ${values.firstName} ${values.lastName} at ${values.email}`,
      style: {
        background: "rgb(220 252 231)",
        color: "rgb(20 83 45)",
        border: "1px solid rgb(187 247 208)",
      },
    })
  }

  const handleCancel = () => {
    onOpenChange(false)
    form.reset()
  }

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (!isOpen) {
      form.reset()
    }
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={handleOpenChange}
      title="Add athlete"
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmitInvitation)}
            disabled={!form.formState.isValid}
            aria-label="Send invitation"
          >
            Send Invitation
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            aria-label="Cancel adding athlete"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit(handleSubmitInvitation)(e)
          }}
          className="flex flex-col gap-6"
        >
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  First Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Last Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="coachingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Coaching Type <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Tabs
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value as "online" | "in-person")
                    }}
                    className="w-full"
                  >
                    <TabsList className="w-full">
                      <TabsTrigger
                        value="online"
                        className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        aria-label="Online coaching"
                      >
                        Online
                      </TabsTrigger>
                      <TabsTrigger
                        value="in-person"
                        className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        aria-label="In-person coaching"
                      >
                        In-person
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SidePanel>
  )
}

