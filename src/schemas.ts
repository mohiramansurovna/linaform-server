import {z} from 'zod';

export const LoginSchema = z.object({
    email: z.string().email({message: 'Invalid email address'}),
    password: z.string().min(6, {message: 'Password must be at least 6 characters'}),
});
export const RegisterSchema = z.object({
    username: z.string().min(3, {message: 'Username must be at least 3 characters'}),
    email: z.string().email({message: 'Invalid email address'}),
    password: z.string().min(6, {message: 'Password must be at least 6 characters'}),
});
export const UserSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
});
export type User = z.infer<typeof UserSchema>;
export const AccessTokenSchema = z.string();
export type AccessToken = z.infer<typeof AccessTokenSchema>;
export const LoginResponceSchema = z.object({
    user: UserSchema,
    accessToken: AccessTokenSchema,
});


export type UpdateNote = z.infer<typeof UpdateNoteSchema>;

//BBUILD: remove zod and only types.
export const NoteSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1, 'Title is required'),
    description:z.string().nullish(),
    content: z.any(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    isPublished: z.boolean().optional(),
    tags:z.array(z.object({
        id:z.string().uuid(),
        label:z.string().min(1),
    })),
    user:z.object({
        id:z.string().uuid(),
        username:z.string().min(1),
    }),
});
export type Note = z.infer<typeof NoteSchema>

export const CreateNoteSchema = z.object({
    title: z.string().min(1),
    content: z.any(),
});
export type CreateNote = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullish(),
    content: z.any().optional(),
    isPublished: z.boolean().optional(),
    publishedAt: z.coerce.date().optional(),
    tags:z.array(z.object({
        id:z.string().uuid(),
        label:z.string().min(1),
    })).optional(),
});

export const CommentSchema = z.object({
    id: z.string().uuid(),
    content: z.string(),
    createdAt: z.coerce.date(),
    user: z.object({
        id: z.string().uuid(),
        username: z.string().min(1),
    }),
});
//BBUILD: work on types properly
export type Comment = z.infer<typeof CommentSchema>

export type Tag = {
    id: string;
    label: string;
};
export type RecommendedNoteByTag = {
    id: string,
    title: string,
    description: string,
    publishedAt: Date,
    isPublished: boolean,
    user: {
        id: string,
        username: string,
    },
    likes: number,
    views: number,
    tags: Tag[],
}

const LikeSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    noteId: z.string().uuid(),
    user: z.object({
        id: z.string().uuid(),
        username: z.string().min(1),
    }),
})
export const PostSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().nullish(),
    content: z.any(),
    publishedAt: z.coerce.date(),
    userId: z.string().uuid(),
    isPublished: z.boolean(),
    user: z.object({
        id: z.string().uuid(),
        username: z.string().min(1),
    }),
    comments: z.array(CommentSchema).optional(),
    likes:LikeSchema.array(),
    views: z.number(),
});
export type Post = z.infer<typeof PostSchema>
