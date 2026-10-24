import { useLayoutEffect, useRef } from 'react'

export default function useFittedContent() {
  const contentRef = useRef(null)

  useLayoutEffect(() => {
    const content = contentRef.current
    const panel = content.parentElement

    function fit() {
      const style = getComputedStyle(panel)
      const height = panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const width = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      // Only reduce content when the fixed viewport cannot contain it. Measuring
      // the untransformed size avoids a resize/scale feedback loop.
      const scale = Math.max(0, Math.min(1, height / content.offsetHeight, width / content.offsetWidth))
      content.style.setProperty('--content-scale', scale)
    }

    const observer = new ResizeObserver(fit)
    observer.observe(panel)
    observer.observe(content)
    fit()
    return () => observer.disconnect()
  }, [])

  return contentRef
}
