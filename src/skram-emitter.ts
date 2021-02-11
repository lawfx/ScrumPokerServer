import { EventEmitter } from 'events';

class SkramEmitter extends EventEmitter {}
const skramEmitter = new SkramEmitter();

export { skramEmitter };
