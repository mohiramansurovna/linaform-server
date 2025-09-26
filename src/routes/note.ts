import {Router} from 'express';
import db from '../lib/db';
import {authMiddleware} from '../middleware/auth';
import {AppRequest, AppResponse} from '../types/http';
import {Note, UpdateNote, UpdateNoteSchema} from '../schemas';
import jwt from 'jsonwebtoken';

const router = Router();

router.get('/', authMiddleware, async (req: AppRequest, res: AppResponse) => {
    const {page = 1, limit = 10} = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    try {
        const [notes, total] = await Promise.all([
            db.note.findMany({
                skip: offset,
                take: limitNum,
                where: {userId: req.user.id},
                select: {id: true, title: true, updatedAt: true, isPublished:true},
                orderBy: {updatedAt: 'desc'},
            }),
            db.note.count({where: {userId: req.user.id}}),
        ]);

        res.status(200).json({
            notes,
            total,
            page: pageNum,
            limit: limitNum,
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.sendStatus(500);
    }
});

router.get('/search', authMiddleware, async (req, res) => {
    const {term = "", page = 1, limit = 10} = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    try {
        const [notes, total] = await Promise.all([
            db.note.findMany({
                skip: offset,
                take: limitNum,
                where: {
                    title: {contains: term as string, mode: 'insensitive'},
                    userId: req.user.id,
                },
                select: {id: true, title: true, updatedAt: true, isPublished:true},
                orderBy: {updatedAt: 'desc'},
            }),
            db.note.count({where: {userId: req.user.id}}),
        ]);

        res.status(200).json({
            notes,
            total,
            page: pageNum,
            limit: limitNum,
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.sendStatus(500);
        return;
    }
});

router.get(
    '/:id',
    authMiddleware,
    async (req: AppRequest & { params: { id: string } }, res: AppResponse<Note | { error: string }>) => {
        // console.log('GET /note/:id', req.params.id);
        let note = undefined;
        try {
            note = await db.note.findFirst({
                where: {
                    id: req.params.id,
                    userId: req.user.id,
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    content: true,
                    createdAt: true,
                    updatedAt:true,
                    isPublished: true,
                    tags:{
                        select:{
                            id:true,
                            label:true,
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            username: true,
                        }
                    }
                }
            });
            if (!note) {
                res.sendStatus(404);
                return;
            }
            res.status(200).json(note);
        } catch (error) {
            console.error('Error fetching notes:', error);
            res.sendStatus(500);
            return;
        }
        return;
    },
);

router.post(
    '/',
    authMiddleware,
    async (req: AppRequest, res: AppResponse<Note | { error: string }>) => {
        console.log('POST /note');
        try {
            const note = await db.note.create({
                data: {
                    title: 'New note',
                    userId: req.user.id,
                    tags: {
                        create: [],
                    },
                },
                select:{
                    id:true,
                    title:true,
                    description:true,
                    content:true,
                    createdAt:true,
                    updatedAt:true,
                    isPublished: true,
                    tags:true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                        }
                    }
                }
            });
            res.status(200).json(note);
            return;
        } catch (err) {
            res.sendStatus(500);
            console.log('Note creating error: ', err);
            return;
        }
    },
);

router.put(
    '/:id',
    authMiddleware,
    async (req: AppRequest<UpdateNote> & { params: { id: string } }, res: AppResponse) => {
        console.log('PUT /note/:id', req.params.id);
        const validation = UpdateNoteSchema.safeParse(req.body);
        if (!validation.success) {
            console.log(validation.error);
            res.status(400).json({error: validation.error.message});
            return;
        }
        const {title, description, content, isPublished, publishedAt, tags} = validation.data;
        try {
            await db.note.update({
                where: {
                    id_userId: {
                        id: req.params.id,
                        userId: req.user.id,
                    },
                },
                data: {
                    title,
                    description,
                    content,
                    isPublished,
                    publishedAt,
                    tags: {
                        set: tags?.map(tag => ({id: tag.id})),
                    },
                },
            });
            res.sendStatus(200);
        } catch (err: any) {
            if (err.code === 'P2025') {
                res.sendStatus(403);
            } else {
                res.sendStatus(500);
            }
        }
    },
);
router.delete(
    '/:id',
    authMiddleware,
    async (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
        console.log('DELETE /note/:id', req.params.id);
        try {
            await db.note.delete({
                where: {
                    id_userId: {
                        id: req.params.id,
                        userId: req.user.id,
                    },
                },
            });
            res.sendStatus(200);
        } catch (err: any) {
            if (err.code === 'P2025') {
                res.sendStatus(403);
            } else {
                res.sendStatus(500);
            }
        }
    },
);

//autosaving only for content

router.post('/autosave', async (req: AppRequest, res: AppResponse) => {
    //I had to do authMiddleware here because the request is sent from the client with a beacon
    console.log('POST /note/autosave');
    const {note, accessToken} = req.body;
    if (!note || !accessToken) {
        res.status(400).json({error: 'Note and accessToken are required'});
        return;
    }
    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as { id: string };
        req.user = {id: decoded.id};
    } catch {
        res.status(406).json({error: 'Invalid token'});
        return;
    }

    try {
        await db.note.update({
            where: {
                id_userId: {
                    id: note.id,
                    userId: req.user.id,
                },
            },
            data: {
                content: note.content,
            },
        });
        res.sendStatus(200);
    } catch {
        res.sendStatus(500);
    }
});
export default router;
