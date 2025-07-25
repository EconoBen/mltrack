import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { Code } from 'nextra/components'

const docsTheme = getDocsMDXComponents()

// Custom Alert/Callout component
function Alert({ type = 'info', children }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900'
  }
  
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  }

  return (
    <div className={`border rounded-lg p-4 my-4 ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>
      {children}
    </div>
  )
}

// Badge component for version tags, status indicators
function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-teal-100 text-teal-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

// Feature Card component
function FeatureCard({ title, description, icon }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      {icon && <div className="text-3xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

// API Reference component
function ApiReference({ method, endpoint, description }) {
  const methodColors = {
    GET: 'bg-blue-500',
    POST: 'bg-green-500',
    PUT: 'bg-yellow-500',
    DELETE: 'bg-red-500',
    PATCH: 'bg-purple-500'
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 my-4">
      <div className="flex items-center gap-3 mb-2">
        <span className={`${methodColors[method]} text-white px-2 py-1 rounded text-sm font-mono`}>
          {method}
        </span>
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{endpoint}</code>
      </div>
      {description && <p className="text-gray-600 text-sm mt-2">{description}</p>}
    </div>
  )
}

// Quick Link component
function QuickLink({ href, title, description }) {
  return (
    <a href={href} className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow no-underline">
      <h4 className="font-semibold text-gray-900 mb-1">{title} →</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  )
}

export function useMDXComponents(components) {
  return {
    ...docsTheme,
    ...components,
    // Custom components
    Alert,
    Badge,
    FeatureCard,
    ApiReference,
    QuickLink,
    // Enhanced code blocks
    pre: (props) => <Code {...props} />,
    // Add custom styling to standard elements
    h1: (props) => <h1 className="text-4xl font-bold mt-8 mb-4" {...props} />,
    h2: (props) => <h2 className="text-3xl font-semibold mt-8 mb-4" {...props} />,
    h3: (props) => <h3 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
    h4: (props) => <h4 className="text-xl font-semibold mt-4 mb-2" {...props} />,
    // Tables with better styling
    table: (props) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full divide-y divide-gray-200" {...props} />
      </div>
    ),
    th: (props) => (
      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
    ),
    td: (props) => (
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" {...props} />
    ),
  }
}