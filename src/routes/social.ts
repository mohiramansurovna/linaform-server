import {AppRequest, AppResponse} from '../types/http';
import {authMiddleware} from '../middleware/auth';
import {Router} from 'express';
import db from '../lib/db';

const router = Router();

router.get('/likedPosts/:page', authMiddleware, async (req: AppRequest, res: AppResponse) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    try {
        const likes=await db.like.findMany({
            where: {
                userId: req.user.id,
            },
            skip,
            take: limit,
            select: {
                note: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        publishedAt: true,
                        tags: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                        views: true,
                    },
                },
            },
        });
        res.status(200).json({
            likes: likes,
            nextPage: likes.length < limit ? null : page + 1,
        })
    }catch (error) {
        console.error('Error fetching liked posts:', error);
        res.sendStatus(500);
    }
});

router.get('/following',authMiddleware,async (req: AppRequest, res: AppResponse) => {
    try{
        const userWithFollowing = await db.user.findUnique({
            where: { id: req.user.id },
            select: {
                following: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        res.status(200).json(userWithFollowing?.following || []);

    }catch (error) {
        console.error('Error fetching following:', error);
        res.sendStatus(500);
    }
})
router.get('/user/:id', async (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
    try {
        const user = await db.user.findUnique({
            where: {
                id: req.params.id,
            },
            select: {
                id: true,
                username: true,
                email: true,
                following: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                followers: {
                    select: {
                        id: true,
                        username: true,
                    }
                }
            },
        })
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.sendStatus(500);
    }
})

router.post('/follow/:id', authMiddleware, async (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
    try {
        const user = await db.user.findUnique({
            where: {
                id: req.params.id,
            },
        })
        if (!user) {
            res.status(404).json({error: 'User not found'});
            return;
        }
        if (req.params.id === req.user.id) {
            res.status(400).json({ error: "You cannot follow yourself" });
            return;
        }

        await db.user.update({
            where: {
                id: req.user.id,
            },
            data: {
                following: {
                    connect: {
                        id: req.params.id,
                    },
                },
            }
        })
        res.status(200).json({message:"followed"});
    }catch (error) {
        console.error('Error following user:', error);
        res.sendStatus(500);
    }
})
router.post('/unfollow/:id', authMiddleware, async (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
    try{
        const user = await db.user.findUnique({
            where: {
                id: req.params.id,
            },
        })
        if (!user) {
            res.status(404).json({error: 'User not found'});
            return;
        }
        await db.user.update({
            where: {
                id: req.user.id,
            },
            data: {
                following: {
                    disconnect: {
                        id: req.params.id,
                    },
                },
            }
        })
        res.status(200).json({message:"unfollowed"});
    }catch (err) {
        console.error('Error unfollowing user:', err);
        res.sendStatus(500);
    }
})

router.get('/authorPosts/:authorId/:page',async(req:AppRequest&{params:{authorId:string, page:string}}, res:AppResponse)=>{
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    try{
        const authorPubNotes=await db.note.findMany({
            where:{
                userId:req.params.authorId,
                isPublished:true,
            },
            skip,
            take:limit,
            select:{
                id:true,
                title:true,
                description:true,
                publishedAt:true,
                tags:true,
                user: {
                    select: {
                        id: true,
                        username: true,
                    }
                },
                likes:{
                    select:{
                        id:true,
                        userId:true,
                    }
                },
                views:true,
            }
        })
        res.status(200).json({
            posts: authorPubNotes,
            nextPage: authorPubNotes.length < limit ? null : page + 1,
        })
    }catch(err){
        console.error('Error fetching author posts:', err);
        res.sendStatus(500);
    }
})


export default router;