// Vite's ?raw imports give a file's text (used by src/_app/styles/tokens.test.ts).
declare module '*?raw' {
  const content: string;
  export default content;
}
