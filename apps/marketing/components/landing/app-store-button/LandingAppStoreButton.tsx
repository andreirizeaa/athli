import Link from 'next/link'

type AppStore = 'ios-appstore' | 'google-playstore'
type Variant = 'black' | 'white'

interface LandingAppStoreButtonProps {
    appStore: AppStore
    variant?: Variant
    href?: string
    className?: string
}

function AppleLogo({ fill }: { fill: string }) {
    return (
        <svg width="20" height="24" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M13.962 10.571c-.024-2.506 2.047-3.714 2.14-3.773-1.168-1.708-2.986-1.942-3.626-1.964-1.532-.159-3.014.912-3.796.912-.794 0-2.006-.896-3.304-.87-1.686.026-3.258.994-4.124 2.506-1.778 3.082-.454 7.622 1.253 10.116.852 1.224 1.852 2.594 3.17 2.546 1.28-.052 1.76-.822 3.304-.822 1.534 0 1.974.822 3.306.792 1.376-.022 2.242-1.232 3.07-2.466.988-1.408 1.386-2.79 1.4-2.862-.032-.012-2.668-1.024-2.694-4.066zM11.378 3.342C12.066 2.486 12.534 1.31 12.404.134c-1 .044-2.218.68-2.932 1.524-.636.748-1.2 1.966-1.052 3.118 1.112.086 2.252-.566 2.958-1.434z"
                fill={fill}
            />
        </svg>
    )
}

function GooglePlayLogo() {
    return (
        <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M.71.47a1.8 1.8 0 0 0-.56 1.36v18.34c0 .54.2.98.56 1.36l.08.06L11.36 11v-.26L.79.41.71.47z" fill="#4285F4" />
            <path d="M14.9 14.56l-3.54-3.56v-.26l3.54-3.56.08.04 4.2 2.38c1.2.68 1.2 1.78 0 2.46l-4.2 2.38-.08.12z" fill="#FBBC04" />
            <path d="M15 14.44L11.36 10.8.71 21.53c.4.42 1.04.46 1.78.04L15 14.44z" fill="#EA4335" />
            <path d="M15 7.56L2.49.43C1.75.01 1.1.05.71.47L11.36 11.2 15 7.56z" fill="#34A853" />
        </svg>
    )
}

export function LandingAppStoreButton({ appStore, variant = 'black', href = '#', className = '' }: LandingAppStoreButtonProps) {
    const isIos = appStore === 'ios-appstore'
    const bg = variant === 'black' ? 'bg-black' : 'bg-white'
    const textColor = variant === 'black' ? 'text-white' : 'text-black'
    const border = variant === 'white' ? 'border border-zinc-300' : 'border border-transparent'

    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-3 rounded-xl px-5 py-3 transition-opacity hover:opacity-80 ${bg} ${border} ${className}`}
        >
            {isIos ? <AppleLogo fill={variant === 'black' ? '#fff' : '#000'} /> : <GooglePlayLogo />}
            <div className="flex flex-col">
                <span className={`text-[10px] leading-tight ${textColor}`}>
                    {isIos ? 'Download on the' : 'GET IT ON'}
                </span>
                <span className={`text-base font-semibold leading-tight ${textColor}`}>
                    {isIos ? 'App Store' : 'Google Play'}
                </span>
            </div>
        </Link>
    )
}
