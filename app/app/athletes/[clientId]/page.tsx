import { redirect } from "next/navigation"

type ClientPageProps = {
  params: {
    clientId: string
  }
}

const ClientPage = ({ params }: ClientPageProps) => {
  redirect(`/app/athletes/${params.clientId}/overview`)
}

export default ClientPage
