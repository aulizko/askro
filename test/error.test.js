var ValidationError = require('../lib/errors').ValidationError;
var test = require('tape').test;

test("Error", function (t) {
    t.test('Test message for error', function (t) {
        var str = "Testing message";
        var err = new ValidationError(str);

        t.equal(err.name, "ValidationError");
        t.equal(err.message, str);
        t.ok(err instanceof ValidationError);
        t.ok(err instanceof Error);

        t.end();
    });

    t.test('Test stack trace', function thisTestFunctionTitleExistsSolelyForTestPurposesDoNotDoItByYourself(t) {
        function testingStackTraceCapture() {
            throw new ValidationError('Testing purposes only');
        }

        try {
            testingStackTraceCapture();
        } catch (e) {
            t.equal(/thisTestFunctionTitleExistsSolelyForTestPurposesDoNotDoItByYourself/.test(e.stack), true);
            t.equal(/testingStackTraceCapture/.test(e.stack), true);
        }

        t.end();
    });

    t.end();
});