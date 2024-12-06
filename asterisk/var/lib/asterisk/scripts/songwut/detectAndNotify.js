const fs = require('fs');

const filePath = process.argv[2];  // Path to the recorded file
const callerId = process.argv[3];  // Caller ID passed from Asterisk

//if (true) {
if (!filePath || !callerId) {
    process.stdout.write('missing_parameters');
    process.exit(1);  // Exit with error code
}

if (false) {
//if (true) {
    // Simulate success
    process.stdout.write('success');
    process.exit(0);  // Exit with success code
} else {
    // Simulate failure
    process.stdout.write(`no_detect`);
    process.exit(1);  // Exit with error code
}

