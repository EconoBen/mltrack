import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Banner } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './styles.css'
import '../../styles/design-system.css'
import '../../styles/components.css'
import '../../styles/typography.css'

export const metadata = {
  title: 'MLTrack Documentation',
  description: 'Comprehensive documentation for MLTrack - Drop-in MLflow enhancement with deployment capabilities',
}

const banner = (
  <Banner storageKey="mltrack-launch">
    🎉 MLTrack is now open source!{' '}
    <a href="https://github.com/EconoBen/mltrack" className="underline text-amber-600 dark:text-amber-400 font-medium">
      Star us on GitHub →
    </a>
  </Banner>
)

const navbar = (
  <Navbar
    logo={
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm">
          ML
        </div>
        <span className="font-bold text-xl text-gray-900 dark:text-gray-100">MLTrack Docs</span>
      </div>
    }
    projectLink="https://github.com/EconoBen/mltrack"
  />
)

const footer = (
  <Footer>
    <div className="flex w-full items-center justify-between">
      <span>© 2024 MLTrack. All rights reserved.</span>
      <span className="text-teal-600 dark:text-teal-400">Built with ❤️ for ML engineers</span>
    </div>
  </Footer>
)

export default async function DocsLayout({ children }) {
  return (
    <div className="docs-container">
      <Layout
        banner={banner}
        navbar={navbar}
        pageMap={await getPageMap()}
        docsRepositoryBase="https://github.com/EconoBen/mltrack/tree/main/website/src/app/docs"
        footer={footer}
        darkMode={false}
        feedback={{
          content: 'Question? Give us feedback →',
          labels: 'feedback'
        }}
        editLink="Edit this page on GitHub →"
        toc={{
          backToTop: 'Back to top',
          title: 'On This Page',
          float: true,
          extraContent: null
        }}
        navigation={{
          prev: true,
          next: true
        }}
        sidebar={{
          defaultMenuCollapseLevel: 1,
          toggleButton: true,
          autoCollapse: false
        }}
      >
        {children}
      </Layout>
    </div>
  )
}