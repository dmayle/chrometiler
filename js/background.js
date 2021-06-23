var data = JSON.parse(localStorage.getItem("data") || "{}");

/**
 * Communicate with external script
 */
chrome.runtime.onMessageExternal.addListener(function(request, sender,
                                                      sendResponse) {
  var msg = JSON.parse(request);

  switch (msg.type) {
  case "add":
    sendResponse(data);
    break;
  case "get":
    sendResponse(data);
    break;
  default:
    break;
  }
});

chrome.commands.onCommand.addListener(function(command) {
  if (command === "detach-tab") {
    chrome.windows.getLastFocused(
        {
          "windowTypes" : [ "normal", "popup", "panel", "app", "devtools" ],
          "populate" : true
        },
        function(window) {
          for (var index = 0; index < window.tabs.length; ++index) {
            if (window.tabs[index].highlighted) {
              chrome.windows.create(
                  {"tabId" : window.tabs[index].id, "focused" : true});
              return;
            }
          }
        });
    return;
  }

  chrome.windows.getLastFocused(
      {
        "windowTypes" : [ "normal", "popup", "panel", "app", "devtools" ],
        "populate" : true
      },
      function(sourceWindow) {
        if (sourceWindow === undefined) {
          console.log('No suitable window found');
          return;
        }
        var matchingWindow = null;
        var maxOverlapPercentage = 0;
        // Linear walk all windows to find both the leftmost to the right
        // without overlap, and the rightmost with overlap of windows
        // strictly to the right. If for any candidate, two or more have the
        // same left starting postion, choose the top one. If the first
        // option is found, take that, else if the second option is found,
        // take that
        chrome.windows.getAll(
            {"windowTypes" : [ "normal", "popup", "panel", "app", "devtools" ]},
            function(windows) {
              var right = null;
              var rightOverlap = null;
              var left = null;
              var leftOverlap = null;
              var above = null;
              var aboveOverlap = null
              var below = null;
              var belowOverlap = null;
              for (var index = 0; index < windows.length; ++index) {
                var targetWindow = windows[index];
                if (targetWindow.id == sourceWindow.id) {
                  continue;
                }
                // Find candidate windows in every direction
                if (targetWindow.left >=
                    sourceWindow.left + sourceWindow.width) {
                  // Check right
                  if ((right === null) || (targetWindow.left < right.left) ||
                      (targetWindow.left == right.left &&
                       targetWindow.top < right.top)) {
                    right = targetWindow;
                  }
                } else if (targetWindow.left >= sourceWindow.left) {
                  // Check right overlap
                  if ((rightOverlap === null) ||
                      (targetWindow.left < rightOverlap.left) ||
                      (targetWindow.left == rightOverlap.left &&
                       targetWindow.top < rightOverlap.top)) {
                    rightOverlap = targetWindow;
                  }
                }
                if (targetWindow.left + targetWindow.width <=
                    sourceWindow.left) {
                  // Check left
                  if ((left === null) ||
                      (targetWindow.left + targetWindow.width >
                       left.left + left.width) ||
                      ((targetWindow.left + targetWindow.width ==
                        left.left + left.width) &&
                       targetWindow.top < left.top)) {
                    left = targetWindow;
                  }
                } else if (targetWindow.left + targetWindow.width <=
                           sourceWindow.left + sourceWindow.width) {
                  // Check left overlap
                  if ((leftOverlap === null) ||
                      (targetWindow.left + targetWindow.width >
                       leftOverlap.left + leftOverlap.width) ||
                      ((targetWindow.left + targetWindow.width ==
                        leftOverlap.left + leftOverlap.width) &&
                       targetWindow.top < leftOverlap.top)) {
                    leftOverlap = targetWindow;
                  }
                }
                if (targetWindow.top >=
                    sourceWindow.top + sourceWindow.height) {
                  // Check below
                  if ((below === null) || (targetWindow.top < below.top) ||
                      (targetWindow.top == below.top &&
                       targetWindow.left < below.left)) {
                    below = targetWindow;
                  }
                } else if (targetWindow.top >= sourceWindow.top) {
                  // Check below overlap
                  if ((belowOverlap === null) ||
                      (targetWindow.top < belowOverlap.top) ||
                      (targetWindow.top == belowOverlap.top &&
                       targetWindow.left < belowOverlap.left)) {
                    belowOverlap = targetWindow;
                  }
                }
                if (targetWindow.top + targetWindow.height <=
                    sourceWindow.top) {
                  // Check above
                  if ((above === null) ||
                      (targetWindow.top + targetWindow.height >
                       above.top + above.height) ||
                      ((targetWindow.top + targetWindow.height ==
                        above.top + above.height) &&
                       targetWindow.left < above.left)) {
                    above = targetWindow;
                  }
                } else if (targetWindow.top + targetWindow.height <=
                           sourceWindow.top + sourceWindow.height) {
                  // Check above overlap
                  if ((aboveOverlap === null) ||
                      (targetWindow.top + targetWindow.height >
                       aboveOverlap.top + aboveOverlap.height) ||
                      ((targetWindow.top + targetWindow.height ==
                        aboveOverlap.top + aboveOverlap.height) &&
                       targetWindow.left < aboveOverlap.left)) {
                    aboveOverlap = targetWindow;
                  }
                }
              }
              if (command === "attach-right") {
                if (right !== null) {
                  matchingWindow = right;
                } else {
                  matchingWindow = rightOverlap;
                }
              } else if (command === "attach-left") {
                if (left !== null) {
                  matchingWindow = left;
                } else {
                  matchingWindow = leftOverlap;
                }
              } else if (command === "attach-up") {
                if (above !== null) {
                  matchingWindow = above;
                } else {
                  matchingWindow = aboveOverlap;
                }
              } else {
                // command === "attach-down"
                if (below !== null) {
                  matchingWindow = below;
                } else {
                  matchingWindow = belowOverlap;
                }
              }
              if (matchingWindow === null) {
                return;
              }
              console.log('Moving tab');
              for (var index = 0; index < sourceWindow.tabs.length; ++index) {
                if (sourceWindow.tabs[index].highlighted) {
                  chrome.tabs.move(
                      sourceWindow.tabs[index].id,
                      {"windowId" : matchingWindow.id, "index" : -1});
                  chrome.tabs.update(sourceWindow.tabs[index].id,
                                     {"highlighted" : true, "active" : true});
                  chrome.windows.update(matchingWindow.id, {"focused" : true});
                  return;
                }
              }
            });
      });
  return;
});
