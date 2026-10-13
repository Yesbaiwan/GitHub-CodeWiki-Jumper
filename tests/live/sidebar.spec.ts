import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const repositoryUrl = 'https://github.com/qixing-jk/GitHub-CodeWiki-Jumper'
const userscriptPath = new URL('../../dist/github-codewiki-jumper.user.js', import.meta.url)

for (const { classes, sidebarClass, sectionClass } of [
  {
    classes: 'hide-sm hide-md',
    sidebarClass: 'CodeViewSidebar-module__borderGrid__Lpx5q',
    sectionClass: 'SidebarSection-module__sidebarSection__e8jFN',
  },
  {
    classes: 'OverviewSidebar-module__HideWhenNarrow__dOqz1 border-0',
    sidebarClass: 'CodeViewSidebar-module__borderGrid__Lpx5q',
    sectionClass: 'SidebarSection-module__sidebarSection__e8jFN',
  },
  {
    classes: 'HideWhenNarrow__nfGOuR border-0',
    sidebarClass: 'borderGrid__VCnF9i',
    sectionClass: 'sidebarSection__oqw6Y8',
  },
]) {
  for (const hasReportRow of [true, false]) {
    test(`injects into desktop About with ${classes}, report row: ${hasReportRow}`, async ({
      page,
    }) => {
      // GitHub renders a second About section outside the desktop sidebar.
      // Match the structure captured by the failing live smoke test.
      await page.route(repositoryUrl, (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: `
          <section id="mobile-about" class="${sectionClass}">
            <h2>About</h2>
          </section>
          <div class="${sidebarClass}">
            <div id="desktop-about" class="${sectionClass} ${classes}">
              <h2>About</h2>
              ${hasReportRow ? '<div class="mt-2"><a href="/contact/report-content?report=repo">Report repository</a></div>' : ''}
            </div>
            <div id="releases" class="${sectionClass}"><h2>Releases</h2></div>
          </div>`,
        })
      )
      await page.goto(repositoryUrl)
      await page.addScriptTag({ content: await readFile(userscriptPath, 'utf8') })

      const container = page.locator('#jumper-buttons-container')
      await expect(container).toBeVisible()
      await expect(page.locator('#desktop-about #jumper-buttons-container')).toHaveCount(1)
      await expect(page.locator('#mobile-about #jumper-buttons-container')).toHaveCount(0)
      await expect(page.locator('#releases #jumper-buttons-container')).toHaveCount(0)
      await expect(container.getByRole('link', { name: 'DeepWiki', exact: true })).toHaveAttribute(
        'href',
        'https://deepwiki.com/qixing-jk/GitHub-CodeWiki-Jumper'
      )
      if (hasReportRow) {
        await expect(page.locator('#desktop-about .mt-2 + #jumper-buttons-container')).toHaveCount(
          1
        )
      }
      await page.evaluate(() => document.dispatchEvent(new Event('turbo:load')))
      await expect(container).toHaveCount(1)
    })
  }
}
