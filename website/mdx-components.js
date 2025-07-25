import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'

const docsTheme = getDocsMDXComponents()

export function useMDXComponents(components) {
  return {
    ...docsTheme,
    ...components
  }
}