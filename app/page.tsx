'use client'

import { SignInButton, UserButton } from '@clerk/nextjs'
import { Authenticated, Unauthenticated } from 'convex/react'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useTranslations } from 'next-intl'

export default function Home() {
  return (
    <>
      <Authenticated>
        <UserButton />
        <Content />
      </Authenticated>
      <Unauthenticated>
        <SignInButton />
      </Unauthenticated>
    </>
  )
}

function Content() {
  const t = useTranslations('home')
  const messages = useQuery(api.messages.getForCurrentUser)

  return (
    <div>
      {t('authenticatedContent')}: {messages?.length}
    </div>
  )
}
