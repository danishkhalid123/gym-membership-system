import cron from "node-cron";
import { prisma } from "../config/db.ts";

//Everyday at 9am
cron.schedule("0 9 * * *", async () => {
    console.log("Running subscription reminder...");

    try {
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + 3);

        const start = new Date(reminderDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(reminderDate);
        end.setHours(23, 59, 59, 999);
        
        const subscriptions = await prisma.subscriptions.findMany({
            where: {
                end_date: {
                    gte: start,
                    lte: end,
                },
                // status: "active",
            },
            include: {
                user: true,
            },
        });

        for (const subscription of subscriptions) {
            console.log(
                `Reminder for ${subscription.user.email} expires on ${subscription.end_date}`
            );

            // Send email here
            // await sendSubscriptionReminder(subscription.user.email);
        }

        console.log(`${subscriptions.length} reminders processed.`);
    } catch (error) {
        console.error(error);
    }
});