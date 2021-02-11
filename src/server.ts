import App from './app';
import skramRouter from './routes/skram-router';

const app = new App(skramRouter.router, 8080);
app.listen();
export default app;
