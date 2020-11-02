export class Utils {
  /**returns a message in the json form of { message: msg } */
  static createMessageJson(msg: string) {
    return { message: msg };
  }

  static getQueryVariable(url: string, variable: string): string | undefined {
    const query = decodeURI(url).substring(2);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      if (pair[0] == variable) {
        return pair[1]?.trim();
      }
    }
  }
}
