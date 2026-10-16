declare module '*client/dist/server/server.js' {
  const handler: import('./start-handler').StartHandler
  export default handler
}
