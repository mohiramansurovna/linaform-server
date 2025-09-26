import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import noteRoutes from './routes/note';
import postRoutes from './routes/post';
import tagsRoutes from './routes/tags';
import socialRoutes from './routes/social';
import cookieParser from 'cookie-parser'

dotenv.config();
const app = express();

app.use(cors({
    origin: 'https://mohiramansurovna.github.io/linaform-client',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser())

app.use('/api/auth', authRoutes);
app.use('/api/note',noteRoutes)
app.use('/api/post',postRoutes)
app.use('/api/tags', tagsRoutes)
app.use('/api/social', socialRoutes)
app.get('/api', (_req, res) => {
    res.send('server is working');
});

app.listen(3001, () => console.log('Server running at http://localhost:3001'));
