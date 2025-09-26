/**
 * I will have posts, their number of comments, poster name, likes and views
 * post viewer
 * post commenter
 * post like
 * post view
 */
import {Router} from "express";
import {AppRequest, AppResponse} from "../types/http";
import db from "../lib/db";
import {authMiddleware} from "../middleware/auth";
import {Tag} from '@prisma/client';
import {includes} from 'zod/v4';

const router = Router();
router.get('/:id', async (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
    console.log('GET /post/:id');
    try {
        const post = await db.note.findUnique({
            where: {id: req.params.id},
            select: {
                id: true,
                title: true,
                description: true,
                content: true,
                publishedAt: true,
                userId: true,
                isPublished: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                comments: {
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                likes: true,
                views: true,
            },
        });
        if (!post?.isPublished) {
            res.sendStatus(404);
            return;
        }
        res.status(200).json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.sendStatus(500);
    }
});

router.post('/:id/view', (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
    const postId = req.params.id;

    if (req.cookies[`viewed_${postId}`]) {
        res.sendStatus(204);
        return;
    }

    db.note.update({
        where: {id: postId},
        data: {views: {increment: 1}},
    }).catch(console.error);


    res.cookie(`viewed_${postId}`, "1", {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.sendStatus(200);
});

router.post('/:id/like', authMiddleware, async (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
    console.log('POST /post/:id/like');
    try {
        //OPTIMIZE: make id=>noteId+userId so finding will be easier
        const like = await db.like.create({
            data: {
                noteId: req.params.id,
                userId: req.user.id,
            },
        });
        res.status(200).json({like});
    } catch (error) {
        console.error('Error liking post', error);
        res.sendStatus(500);
    }
});
router.post('/:id/unlike', authMiddleware, async (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
    console.log('POST /post/:id/unlike');
    try {
        await db.like.delete({
            where: {
                id: req.params.id,
            },
        });
        res.status(200).json({message: "unliked"});
    } catch (error) {
        console.error('Error liking post', error);
        res.sendStatus(500);
    }
});

router.post('/:id/comment', authMiddleware, async (req: AppRequest & { params: { id: string } }, res: AppResponse) => {
    console.log("posting comment ", req.body.content);
    try {
        await db.comment.create({
            data: {
                content: req.body.content,
                noteId: req.params.id,
                userId: req.user.id,
            },
        });
        res.sendStatus(200);
    } catch (error) {
        console.error('Error posting comment', error);
        res.sendStatus(500);
    }
});

router.get('/:id/similar', async (req, res) => {
    console.log('GET /post/:id/similar');
    try {
        await db.note.findFirst({
            where: {
                id: req.params.id,
            },
            select: {
                tags: true,
            },
        }).then(async (note) => {
            const tags = note?.tags;
            console.log("tags", tags);
            if (!tags || tags.length === 0) {
                res.status(400).json({error: 'Tags are required'});
                return;
            }
            //BBUILD:replace 2 queries with SQL scoring
            const [allTagsNotes, anyTagsNotes] = await Promise.all([
                db.note.findMany({
                    where: {
                        isPublished: true,
                        id: {not: req.params.id},
                        AND: tags.map(tag => ({
                            tags: {
                                some: {id: tag.id},
                            },
                        })),
                    },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        publishedAt: true,
                        likes: true,
                        views: true,
                        user: {select: {id: true, username: true}},
                        tags: {
                            select: {
                                id: true,
                                label: true,
                            },
                        },
                    },
                    orderBy: [
                        {views: 'desc'},
                        {publishedAt: 'desc'},
                    ],
                    take: 10,
                }),

                db.note.findMany({
                    where: {
                        isPublished: true,
                        id: {not: req.params.id},
                        tags: {
                            some: {id: {in: tags.map(tag => tag.id)}},
                        },
                    },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        publishedAt: true,
                        likes: true,
                        views: true,
                        user: {select: {id: true, username: true}},
                        tags: {
                            select: {
                                id: true,
                                label: true,
                            },
                        },
                    },
                    orderBy: [
                        {views: 'desc'},
                        {publishedAt: 'desc'},
                    ],
                    take: 10,

                }),
            ]);

            const merged = [
                ...allTagsNotes,
                ...anyTagsNotes.filter(
                    note => !allTagsNotes.some(n => n.id === note.id),
                ),
            ];

            res.status(200).json(merged);
        });
    } catch (error) {
        console.error('Error fetching posts by tags:', error);
        res.sendStatus(500);
    }
});

router.get('/popular/:page', async (req: AppRequest & { params: { page: string } }, res: AppResponse) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    try {
        const posts = await db.note.findMany({
            where: {
                isPublished: true,
            },
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                description: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                views: true,
                publishedAt: true,
                _count: {select: {likes: true}}, //this is where it counts then sorts likes
            },
            orderBy: {
                likes: {_count: 'desc'},
            },
        });
        res.status(200).json({
            posts,
            nextPage: posts.length < limit ? null : page + 1,
        });
    } catch (err) {
        console.error('Error fetching popular posts:', err);
        res.sendStatus(500);
    }
});

// /search/page?search=query
router.get('/search/:page', async (req:AppRequest & { params: { page: string } }, res:AppResponse)=>{
    const page = parseInt(req.query.page as string) || 1;
    const limit=10
    const skip=(page-1)*limit
    const searchTerm=req.query.search as string
    if(!searchTerm){
        res.status(400).json({error:"search term is required"})
        return
    }
    try{
        const posts=await db.note.findMany({
            where:{
                isPublished:true,
                OR:[
                    {title:{contains:searchTerm, mode:'insensitive'}},
                    {tags:{some:{label:{contains:searchTerm, mode:'insensitive'}}}},
                    {description:{contains:searchTerm, mode:'insensitive'}}
                ]
            },
            select:{
                id:true,
                title:true,
                description:true,
                publishedAt:true,
                views:true,
                likes:true,
                user:{
                    select:{
                        id:true,
                        username:true,
                    }
                },
            }
        })
        res.status(200).json({
            posts,
            nextPage:posts.length<limit?null:page+1
        })
    }catch(err){
        console.error('Error fetching search posts:',err)
        res.sendStatus(500)
    }
})

export default router;