const { admin } = require('../firebaseConfig');

// Configuration
const NEW_PASSWORD = 'sdfiusd23423478fsj3223@$$ksaldfka';
const DELAY_BETWEEN_UPDATES = 2000; // 2 seconds delay between updates to avoid quota limits

// List of failed users from the previous run (UIDs and emails)
const failedUsers = [
    { uid: 'SGd9b7FdpccQZdMH2LZUcI7zcWg2', email: null },
    { uid: null, email: '+9665731702061751193432580@fourpets.com' },
    { uid: 'Gj9gMXGijYUluPBxd209f4ffQr22', email: null },
    { uid: null, email: '+9665344587351751382008696@fourpets.com' },
    { uid: 'IlmbkbAHtESDIsYDKb341IeMk1Q2', email: null },
    { uid: null, email: '+9665816918561762507033710@fourpets.com' },
    { uid: 'H3ioaFGnn7WXaxi29xj4DFb2tES2', email: null },
    { uid: null, email: '+9665433454611739036741@fourpets.com' },
    { uid: null, email: '+9665598840881751739237014@fourpets.com' },
    { uid: 'G9R6doGxaReHTip1Pbl5uHWSgZp1', email: null },
    { uid: null, email: '+9665502717481752188460983@fourpets.com' },
    { uid: null, email: '+9665697130181751205009003@fourpets.com' },
    { uid: null, email: '+9665611942721756381271160@fourpets.com' },
    { uid: null, email: '+9665822715511746086814262@fourpets.com' },
    { uid: null, email: '+9665372776661745341542082@fourpets.com' },
    { uid: null, email: '+9665467050611756892148801@fourpets.com' },
    { uid: null, email: '+9665558621211754912677651@fourpets.com' },
    { uid: 'e58ENVFoiNextYvGgQAJRfr2VSl2', email: null },
    { uid: 'e4pa2QCjywSwOXzjt8G2qo9zAhf1', email: null },
    { uid: null, email: '+9665301111581756376481666@fourpets.com' },
    { uid: null, email: '+96605311669601755958388588@fourpets.com' },
    { uid: null, email: '+9665933033911752653264554@fourpets.com' },
    { uid: null, email: '+96605364022381742701909661@fourpets.com' },
    { uid: null, email: '+9665048921981748618082994@fourpets.com' },
    { uid: null, email: '+9665958971651751730234690@fourpets.com' },
    { uid: 'wj0BdlTX3YObOKvn5ALuquyyWYy1', email: null },
    { uid: null, email: '+9665667445411754989324358@fourpets.com' },
    { uid: null, email: '+2010660321841737017956019@fourpets.com' },
    { uid: null, email: '+9665468657871758900983751@fourpets.com' },
    { uid: null, email: '+9665690562561744726104353@fourpets.com' },
    { uid: 'yBJRyvheISeZbwKDtjHXnaGee582', email: null },
    { uid: null, email: '+9665627310241756461999807@fourpets.com' },
    { uid: null, email: '+9665818753571742342458386@fourpets.com' },
    { uid: 'yJS0EYTL84WCBHSiDknxoF1eMqv1', email: null },
    { uid: 'z6GHGJXLRmYQx4oXCBRooWS8Bk02', email: null },
    { uid: null, email: '+9665557034561750860115807@fourpets.com' },
    { uid: null, email: '+9665419380821742291781458@fourpets.com' },
    { uid: 'WgyQdkyyQsPd5TIyfbWUqiCuhvJ2', email: null },
    { uid: null, email: '+9665356810021748612355376@fourpets.com' },
    { uid: 'hZ8GIzuzYqfdPS4aZnc7OJ59p1p2', email: null },
    { uid: null, email: '+9665300894721747945314596@fourpets.com' },
    { uid: null, email: '+2015222233331747436096682@fourpets.com' },
    { uid: 'FUKL6bEKU4hAhPLKnLSTfE0iPuV2', email: null },
    { uid: 'HyqiyLfra8PA0YbstM0JUqiF1g03', email: null },
    { uid: 'IBgQHgA2a5XJbOIcAnShNq1D2Yv2', email: null },
    { uid: null, email: '+9665372297361748625803009@fourpets.com' },
    { uid: null, email: '+9665832176781744623354744@fourpets.com' },
    { uid: null, email: 'phoneuser1738505370857@fourpets.com' },
    { uid: null, email: '+9665578091811749055911801@fourpets.com' },
    { uid: null, email: '+9662223334441762255703061@fourpets.com' },
    { uid: null, email: '+9665302943961742692822555@fourpets.com' },
    { uid: null, email: '+9665582455861758968829857@fourpets.com' },
    { uid: 'uhcvTdk8DAPlfu96mS9GtdyrG5i1', email: null },
    { uid: null, email: '+9665610152531754070497347@fourpets.com' },
    { uid: null, email: '+9665490750951753607973162@fourpets.com' },
    { uid: '1zGLmXi1ObVanWAcw4C76x9gf0J3', email: null },
    { uid: '21Ar0TTntxY1a5i48vD5bEiZa8i2', email: null },
    { uid: null, email: '+9665337745251755970560717@fourpets.com' },
    { uid: null, email: 'test@example.com' },
    { uid: null, email: '+9665335120491742669400089@fourpets.com' },
    { uid: '1ihURrSoVweNmRxpdMPsABDxUQR2', email: null },
    { uid: '2Uhxn3azvOVpdgdVFjWq7HUX4lI2', email: null },
    { uid: null, email: 'phoneuser1727276830198@fourpets.com' },
    { uid: null, email: '+9665955953451743241238811@fourpets.com' },
    { uid: '11du6iWhy7Ymyp8KIojQ3ipYO0U2', email: null },
    { uid: 'rnuIrs2qnmbdkVSV83nhkMoJUcE3', email: null },
    { uid: null, email: '+9665404464821755503780567@fourpets.com' },
    { uid: null, email: '+9665822127781748618386909@fourpets.com' },
    { uid: null, email: '+9665570715081754666079256@fourpets.com' },
    { uid: null, email: '+9665672678781742580037195@fourpets.com' },
    { uid: null, email: '+9665900141661740650264230@fourpets.com' },
    { uid: 'Xr3cEyRdZRT337cV7bssEAzpXzi2', email: null },
    { uid: null, email: '+9665037569121756874119557@fourpets.com' },
    { uid: null, email: '+9665836046551738748369@fourpets.com' },
    { uid: 'ni4zyeefHxRCwCgDsZxDCIIKQXQ2', email: null },
    { uid: 'X7VVStRBLJfVUMeoh7GbYHcl9fz2', email: null },
    { uid: 'oi7egkIVsbTYAFfVlmB3DVcI5uF2', email: null },
    { uid: 'OXEQ4tukNZYJGuWzpE2HfOel31v2', email: null },
    { uid: null, email: '+9665588930221757953736499@fourpets.com' },
    { uid: null, email: '+9661234567891762256214398@fourpets.com' },
    { uid: null, email: '+9665613703411751714951081@fourpets.com' },
    { uid: null, email: 'phoneuser1737692488803@fourpets.com' },
    { uid: null, email: '+9665391408281748621032842@fourpets.com' },
    { uid: null, email: '+9665350929261747817062423@fourpets.com' },
    { uid: null, email: '+9665333968391740909912633@fourpets.com' },
    { uid: null, email: '+9665483300131743187773022@fourpets.com' },
    { uid: 'gPYaSvOKhDW0Pv0LOdagh55PRrL2', email: null },
    { uid: 'Tv9fK0scWAXHQGsAMAtoMexVqWr1', email: null },
    { uid: 'XnbDXUgGIEYIEV63RuIKdchklgD3', email: null },
    { uid: null, email: '+96605573262271756985940506@fourpets.com' },
    { uid: null, email: '+9665012265451759401080256@fourpets.com' },
    { uid: null, email: '+9665078020141756281839806@fourpets.com' },
    { uid: 'P79PbZEJidYKMHOAJkLBXLlv04g2', email: null },
    { uid: null, email: '+9662223334441740399792549@fourpets.com' },
    { uid: null, email: '+9665092378601753272676002@fourpets.com' },
    { uid: null, email: '+9665603085041752159730646@fourpets.com' },
    { uid: null, email: '+9665062607731760226617822@fourpets.com' },
    { uid: null, email: '+9665829814721748122133279@fourpets.com' },
    { uid: 'gFnZjQBB0HRxjdci4qwcroFVsfQ2', email: null },
    { uid: null, email: '+9665608057501746909488030@fourpets.com' },
    { uid: null, email: '+9665523982551756638028243@fourpets.com' },
    { uid: null, email: '+9665825812621752257611906@fourpets.com' },
    { uid: 'hJY3y4sCgQWs76eDPrwKhMtuCbr2', email: null },
    { uid: 'Tjqse8P7aia68IRVZtweZWgvlF23', email: null },
    { uid: null, email: '+96605071814951748822326905@fourpets.com' },
    { uid: null, email: '+96605761467801746343865232@fourpets.com' },
    { uid: null, email: '+9665952093221743494737007@fourpets.com' },
    { uid: null, email: '+2010111914121738867838260@fourpets.com' },
    { uid: null, email: '+9665008017351757145650140@fourpets.com' },
    { uid: null, email: '+9665363777101749498895715@fourpets.com' },
    { uid: null, email: '+96605088579001748614502025@fourpets.com' },
    { uid: null, email: '+9665562686701757335123220@fourpets.com' },
    { uid: null, email: '+9665364827091762171978178@fourpets.com' },
    { uid: null, email: '+9665333441051751727800881@fourpets.com' },
    { uid: null, email: '+9665933980811756911998877@fourpets.com' },
    { uid: null, email: '+9665537268801745819958044@fourpets.com' },
    { uid: null, email: '+9665062796591757774759321@fourpets.com' },
    { uid: null, email: '+9665516573531755427271063@fourpets.com' },
    { uid: null, email: 'test3@example.com' },
    { uid: 'UrXBp9jZPANkWDr9RsMKajzSFXh2', email: null },
    { uid: null, email: '+9665316705621756415093704@fourpets.com' },
    { uid: null, email: '+9665418139861741190263346@fourpets.com' },
    { uid: null, email: '+9665650287991755562535109@fourpets.com' },
    { uid: null, email: '+9665058737111757269119496@fourpets.com' },
    { uid: null, email: '+9665384177381755711858144@fourpets.com' },
    { uid: null, email: '+9665345931031760895997322@fourpets.com' },
    { uid: 'uGoF3Vtr6bNg4qx1fJ4kgvfQJHo1', email: null },
    { uid: 'txbST0aub0hR01ddMX5kys70p262', email: null },
    { uid: 'tKp8kB4muXb1eoX7NbxpOfHOSrt1', email: null },
    { uid: null, email: '+9665038844981752330582563@fourpets.com' },
    { uid: null, email: '+9665055405301755279043489@fourpets.com' },
    { uid: 'sGWiSJBFtwhwoxgQbBwMdxbhJhB3', email: null },
    { uid: null, email: '+9665078574161749543841768@fourpets.com' },
    { uid: null, email: '+9665441456641746081994865@fourpets.com' },
    { uid: 'vcdEW4miMITxsygdQNSzmx5oR1l2', email: null },
    { uid: 'p3aGWPiI7CNC8ae4PKN6odudpqY2', email: null },
    { uid: 'oQfTFzvcSCfOqPk25WgzRXCXkqj1', email: null },
    { uid: 'pZKbEJN6y7ThcEIplxYsZqi1pzq2', email: null },
    { uid: 'casTL5GfwyZzaHOvbuhDx2cRqUW2', email: null },
    { uid: null, email: '+9665369569221758014818759@fourpets.com' },
    { uid: 'c9lWrJFfbjaTR0CgdB9k5auZy2J3', email: null },
    { uid: null, email: '+9665967745751747828110528@fourpets.com' },
    { uid: null, email: '+9665435760801742679113201@fourpets.com' }
];

// Statistics tracking
let stats = {
    totalUsers: 0,
    updated: 0,
    failed: 0,
    errors: []
};

/**
 * Get user by email (if UID is not available)
 */
async function getUserByEmail(email) {
    try {
        const user = await admin.auth().getUserByEmail(email);
        return user;
    } catch (error) {
        return null;
    }
}

/**
 * Update password for a single user
 */
async function updateUserPassword(uid, email) {
    try {
        await admin.auth().updateUser(uid, {
            password: NEW_PASSWORD
        });
        stats.updated++;
        console.log(`✓ Updated password for user: ${email || uid}`);
        return { success: true, uid, email };
    } catch (error) {
        stats.failed++;
        stats.errors.push({ uid, email, error: error.message });
        console.error(`✗ Failed to update password for user ${email || uid}: ${error.message}`);
        return { success: false, uid, email, error: error.message };
    }
}

/**
 * Retry failed users
 */
async function retryFailedUsers() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 RETRY FAILED USERS - Password Update Script');
    console.log('='.repeat(60));
    console.log(`\n📋 Retrying ${failedUsers.length} failed users...`);
    console.log(`⏱️  Delay between updates: ${DELAY_BETWEEN_UPDATES}ms\n`);
    
    stats.totalUsers = failedUsers.length;
    
    for (let i = 0; i < failedUsers.length; i++) {
        const user = failedUsers[i];
        let uid = user.uid;
        const email = user.email;
        
        // If no UID, try to get it from email
        if (!uid && email) {
            console.log(`\n🔍 Looking up user by email: ${email}`);
            const userRecord = await getUserByEmail(email);
            if (userRecord) {
                uid = userRecord.uid;
                console.log(`   Found UID: ${uid}`);
            } else {
                console.error(`   ❌ User not found with email: ${email}`);
                stats.failed++;
                stats.errors.push({ uid: null, email, error: 'User not found' });
                continue;
            }
        }
        
        if (!uid) {
            console.error(`   ❌ No UID or email provided for user ${i + 1}`);
            stats.failed++;
            continue;
        }
        
        console.log(`\n[${i + 1}/${failedUsers.length}] Processing: ${email || uid}`);
        await updateUserPassword(uid, email);
        
        // Add delay between updates to avoid quota limits
        if (i < failedUsers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_UPDATES));
        }
    }
    
    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 FINAL STATISTICS:');
    console.log(`  Total users processed: ${stats.totalUsers}`);
    console.log(`  Successfully updated: ${stats.updated}`);
    console.log(`  Failed: ${stats.failed}`);
    
    if (stats.failed > 0) {
        console.log('\n⚠️  Some users failed to update:');
        stats.errors.forEach((err, index) => {
            console.log(`  ${index + 1}. ${err.email || err.uid}: ${err.error}`);
        });
    }
    
    if (stats.updated === stats.totalUsers) {
        console.log('\n✅ SUCCESS! All failed users have been updated.');
    } else if (stats.updated > 0) {
        console.log(`\n⚠️  PARTIAL SUCCESS: ${stats.updated}/${stats.totalUsers} users updated.`);
    } else {
        console.log('\n❌ FAILED: No users were updated. Please check the errors above.');
    }
}

// Run the script
retryFailedUsers().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});

