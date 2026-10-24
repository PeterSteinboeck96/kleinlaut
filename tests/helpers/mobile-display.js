// Headless browsers have no native address bar. Model the large CSS viewport
// independently of both the visible page area and the hardware screen.
export async function modelLargeViewport(page, height) {
  await page.addInitScript(height => {
    const apply = () => {
      if (!document.documentElement) return false
      document.documentElement.style.setProperty('--large-viewport-height', `${window.testCoverHeight ?? height}px`)
      return true
    }
    if (apply()) return
    const observer = new MutationObserver(() => { if (apply()) observer.disconnect() })
    observer.observe(document, { childList: true, subtree: true })
  }, height)
}
