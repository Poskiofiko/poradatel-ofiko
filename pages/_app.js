import { useEffect } from 'react'

import '../global.css'

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem('ofiko-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = savedTheme || (prefersDark ? 'dark' : 'light')

    document.documentElement.dataset.theme = theme
  }, [])

  return <Component {...pageProps} />
}
