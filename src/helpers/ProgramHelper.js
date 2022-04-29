import url from 'url';
import path from 'path';

class ProgramHelper {
  static getRootPath() {
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    return path.join(__dirname, `..`, `..`);
  }
}

export default ProgramHelper;
