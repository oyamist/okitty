(function(exports) {
    class IConsole {
        static inject(obj, logger) {
            Object.defineProperty(obj, "log", {
                value: (...args) => {
                    logger && logger.log.apply(logger, args);
                },
            });
            Object.defineProperty(obj, "error", {
                value: (...args) => {
                    var elogger = logger || console;
                    elogger.error.call(elogger, "ERROR:", ...args); 
                },
            });
        }
    } 

    module.exports = exports.IConsole = IConsole;
})(typeof exports === "object" ? exports : (exports = {}));

