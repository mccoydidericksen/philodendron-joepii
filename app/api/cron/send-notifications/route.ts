import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { processTaskNotifications } from '@/lib/services/notification-service';

/**
 * Cron job endpoint for sending task notifications
 * This should be called periodically by Vercel Cron (configured in vercel.json)
 *
 * To test locally: curl http://localhost:3000/api/cron/send-notifications
 */
export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron or localhost (for development)
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    // In production, verify this is from Vercel Cron
    // You can set CRON_SECRET in your environment variables for additional security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔔 Starting notification cron job...');
    const startTime = Date.now();

    // Process and send notifications
    const result = await processTaskNotifications();

    const duration = Date.now() - startTime;

    console.log(`✅ Notification cron job completed in ${duration}ms`);
    console.log(`   - Notifications sent: ${result.notificationsSent}`);
    console.log(`   - Errors: ${result.errors.length}`);

    return NextResponse.json({
      success: result.success,
      notificationsSent: result.notificationsSent,
      errors: result.errors,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in notification cron job:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Optional: Allow POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
