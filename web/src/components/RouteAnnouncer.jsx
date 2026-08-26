import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const BASE_TITLE = 'تفسير النابلسي'

const ROUTE_TITLES = {
  '/': 'القرآن الكريم',
  '/search': 'بحث في القرآن والتفسير',
}

export default function RouteAnnouncer() {
  const { pathname } = useLocation()
  const h1Ref = useRef(null)

  useEffect(() => {
    const title = ROUTE_TITLES[pathname] || BASE_TITLE
    document.title = `${title} | ${BASE_TITLE}`

    const timer = setTimeout(() => {
      const h1 = document.querySelector('h1')
      if (h1) {
        h1.setAttribute('tabindex', '-1')
        h1.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
