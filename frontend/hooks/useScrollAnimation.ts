import { useEffect } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function useScrollAnimation() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    return () => ScrollTrigger.getAll().forEach((t) => t.kill())
  }, [])
}
