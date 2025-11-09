const { admin } = require('../firebaseConfig');

// Configuration
const NEW_PASSWORD = 'sdfiusd23423478fsj3223@$';
const TEST_MODE = process.env.TEST_MODE === 'true' || process.argv.includes('--test');

// Extract UID from command line arguments (format: --uid VqLVD8EMQXM3voz7z1zBVZQzvKw1)
const getUidFromArgs = () => {
    const uidIndex = process.argv.indexOf('--uid');
    if (uidIndex !== -1 && process.argv[uidIndex + 1]) {
        return process.argv[uidIndex + 1];
    }
    return null;
};
const TEST_UID = getUidFromArgs();

// Statistics tracking
let stats = {
    totalUsers: 0,
    updated: 0,
    failed: 0,
    errors: []
};

/**
 * Update password for a single user
 */
async function updateUserPassword(uid, email) {
    try {
        const userRecord = await admin.auth().updateUser(uid, {
            password: NEW_PASSWORD
        });
        stats.updated++;
        console.log(`✓ Updated password for user: ${email || uid}`);
        return { success: true, uid, email, userRecord };
    } catch (error) {
        stats.failed++;
        stats.errors.push({ uid, email, error: error.message });
        console.error(`✗ Failed to update password for user ${email || uid}: ${error.message}`);
        return { success: false, uid, email, error: error.message };
    }
}

/**
 * Test mode: Update password for a specific user (by UID) or first user found
 */
async function testUpdateSingleUser() {
    console.log('\n🧪 TEST MODE: Updating password for ONE user only\n');
    console.log('='.repeat(60));
    
    try {
        let user;
        
        if (TEST_UID) {
            // Test with specific UID provided
            console.log(`\n📋 Testing with specific UID: ${TEST_UID}\n`);
            try {
                user = await admin.auth().getUser(TEST_UID);
                stats.totalUsers = 1;
            } catch (error) {
                console.error(`❌ User with UID ${TEST_UID} not found: ${error.message}`);
                return;
            }
        } else {
            // Get first batch of users (max 1 user)
            const listUsersResult = await admin.auth().listUsers(1);
            
            if (listUsersResult.users.length === 0) {
                console.log('❌ No users found in Firebase Authentication');
                return;
            }
            
            user = listUsersResult.users[0];
            stats.totalUsers = 1;
        }
        
        console.log(`\nFound user to test (BEFORE UPDATE):`);
        console.log(`  UID: ${user.uid}`);
        console.log(`  Email: ${user.email || 'N/A'}`);
        console.log(`  Display Name: ${user.displayName || 'N/A'}`);
        console.log(`  Created: ${user.metadata.creationTime || 'N/A'}`);
        console.log(`  Last Sign In: ${user.metadata.lastSignInTime || 'N/A'}`);
        console.log(`  Disabled: ${user.disabled || false}`);
        console.log(`\nUpdating password...\n`);
        
        const updateResult = await updateUserPassword(user.uid, user.email);
        
        // Display the user record returned from updateUser (this confirms the update)
        if (updateResult.success && updateResult.userRecord) {
            const updatedUser = updateResult.userRecord;
            
            console.log('\n' + '='.repeat(60));
            console.log('\n✅ UPDATED USER RECORD (returned from updateUser):');
            console.log(`  UID: ${updatedUser.uid}`);
            console.log(`  Email: ${updatedUser.email || 'N/A'}`);
            console.log(`  Display Name: ${updatedUser.displayName || 'N/A'}`);
            console.log(`  Created: ${updatedUser.metadata.creationTime || 'N/A'}`);
            console.log(`  Last Sign In: ${updatedUser.metadata.lastSignInTime || 'N/A'}`);
            console.log(`  Disabled: ${updatedUser.disabled || false}`);
            console.log(`  Email Verified: ${updatedUser.emailVerified || false}`);
            console.log(`  Password Hash: ${updatedUser.passwordHash ? '***SET (Password Updated)***' : 'N/A'}`);
            console.log(`  Password Salt: ${updatedUser.passwordSalt ? '***SET***' : 'N/A'}`);
            console.log(`  Last Refresh Time: ${updatedUser.metadata.lastRefreshTime || 'N/A'} (Note: This only changes on user sign-in, not password update)`);
            
            // Additional verification: Check if passwordHash exists (confirms password was set)
            if (updatedUser.passwordHash) {
                console.log(`\n  ✓ Password Hash is present - confirms password was successfully updated!`);
            }
        } else {
            console.log('\n❌ Could not retrieve updated user record');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('\n📊 TEST RESULTS:');
        console.log(`  Total users processed: ${stats.totalUsers}`);
        console.log(`  Successfully updated: ${stats.updated}`);
        console.log(`  Failed: ${stats.failed}`);
        
        if (stats.updated > 0) {
            console.log('\n✅ TEST SUCCESSFUL! Password update works correctly.');
            console.log('   User record has been updated.');
            console.log('   You can now run the script without --test flag to update all users.');
        } else {
            console.log('\n❌ TEST FAILED! Please check the error above.');
        }
        
    } catch (error) {
        console.error('\n❌ Error in test mode:', error.message);
        console.error(error);
    }
}

/**
 * Production mode: Update passwords for ALL users
 */
async function updateAllUserPasswords(nextPageToken = null) {
    try {
        // List users in batches (max 1000 per page)
        // Only pass pageToken if it's not null
        const listUsersResult = nextPageToken 
            ? await admin.auth().listUsers(1000, nextPageToken)
            : await admin.auth().listUsers(1000);
        
        if (listUsersResult.users.length === 0 && !nextPageToken) {
            console.log('❌ No users found in Firebase Authentication');
            return;
        }
        
        stats.totalUsers += listUsersResult.users.length;
        console.log(`\n📦 Processing batch of ${listUsersResult.users.length} users...`);
        
        // Update all users in the current batch
        const updatePromises = listUsersResult.users.map(user => 
            updateUserPassword(user.uid, user.email)
        );
        
        // Wait for all updates in the current batch to complete
        await Promise.all(updatePromises);
        
        console.log(`\n✓ Completed batch. Total processed so far: ${stats.totalUsers}`);
        
        // If there are more users to fetch, continue with the next page
        if (listUsersResult.pageToken) {
            console.log('📄 Fetching next page...');
            await updateAllUserPasswords(listUsersResult.pageToken);
        } else {
            // All users processed
            console.log('\n' + '='.repeat(60));
            console.log('\n📊 FINAL STATISTICS:');
            console.log(`  Total users found: ${stats.totalUsers}`);
            console.log(`  Successfully updated: ${stats.updated}`);
            console.log(`  Failed: ${stats.failed}`);
            
            if (stats.failed > 0) {
                console.log('\n⚠️  Some users failed to update:');
                stats.errors.forEach((err, index) => {
                    console.log(`  ${index + 1}. ${err.email || err.uid}: ${err.error}`);
                });
            }
            
            if (stats.updated === stats.totalUsers) {
                console.log('\n✅ SUCCESS! All user passwords have been updated.');
            } else if (stats.updated > 0) {
                console.log(`\n⚠️  PARTIAL SUCCESS: ${stats.updated}/${stats.totalUsers} users updated.`);
            } else {
                console.log('\n❌ FAILED: No users were updated. Please check the errors above.');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Error updating user passwords:', error.message);
        console.error(error);
        process.exit(1);
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 Firebase Authentication Password Update Script');
    console.log('='.repeat(60));
    
    if (TEST_MODE) {
        await testUpdateSingleUser();
    } else {
        console.log('\n🚀 PRODUCTION MODE: Updating passwords for ALL users\n');
        console.log('⚠️  WARNING: This will update passwords for ALL users in Firebase Authentication!');
        console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
        
        // Give user 5 seconds to cancel
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('Starting bulk update...\n');
        await updateAllUserPasswords();
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Script completed.\n');
    process.exit(0);
}

// Run the script
main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});

