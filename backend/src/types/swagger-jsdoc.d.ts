declare module 'swagger-jsdoc' {
  interface Options {
    definition?: Record<string, unknown>
    apis?: string[]
  }
  function swaggerJSDoc(options?: Options): Record<string, unknown>
  export default swaggerJSDoc
}