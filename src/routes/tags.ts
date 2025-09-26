import {Router} from 'express';
import db from '../lib/db';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const tags = await db.tag.findMany({
            select: {
                id: true,
                label: true,
                notes: {
                    select: {id: true},
                },
            },
        });
        res.status(200).json(tags);
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.sendStatus(500);
    }
});


router.post('/', async (req, res) => {
    const {label} = req.body;
    if (!label) {
        res.status(400).json({error: 'Label is required'});
        return;
    }
    try {
        const tag = await db.tag.create({
                data: {
                    label,
                },

            },
        );
        res.status(200).json({tag});
    } catch (error) {
        console.error('Error creating tag:', error);
        res.sendStatus(500);
    }
});

router.get('/clear', async (req, res) => {
    try {
        await db.tag.deleteMany({
            where: {
                notes: {
                    none: {},
                },
            },
        });
        res.status(200).send('Cleared successfully');
    }catch (error) {
        console.error('Error deleting tags:', error);
        res.sendStatus(500);
    }
});

router.delete('/:id', async (req, res) => {
    //BBUILD: automated cleanup of tags with no notes by CRONs
    /*
    * db.tag.deleteMany({
    *   where:{
    *     notes:{
    *       none:{}
    *     }
    *   }
    * */

    try {
        db.tag.delete({
            where: {
                id: req.params.id,
                notes: {
                    none: {},
                },
            },
        });
        res.sendStatus(200);
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.sendStatus(500);
    }
});

router.get('/:id/posts',async(req,res)=>{
    try {
        const posts = await db.note.findMany({
            where: {
                tags: {
                    some: {
                        id: req.params.id,
                    },
                },
            },
        })
        res.status(200).json(posts);
    }catch (error) {
        console.error('Error fetching posts by tag:', error);
        res.sendStatus(500);
    }
})


export default router;
