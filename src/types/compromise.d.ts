declare module 'compromise' {
  interface Document {
    terms(): {
      out(format: string): string[];
    };
  }
  
  function nlp(text: string): Document;
  
  export default nlp;
} 