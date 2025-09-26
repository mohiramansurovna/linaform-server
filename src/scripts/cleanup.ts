import db from '../lib/db';
async function cleanupExpiredRefreshTokens() {
    const result = await db.refreshToken.deleteMany({
        where: {
            expiresAt: {lt: new Date()},
        },
    });

    console.log(`Deleted ${result.count} expired refresh tokens`);
    process.exit(0);
}

cleanupExpiredRefreshTokens().catch(err => {
    console.error('Failed to clean refresh tokens:', err);
    process.exit(1);
});
