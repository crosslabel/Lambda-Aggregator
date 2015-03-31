module.exports = function(s) {

	var site = s;                      // the site object
	var root = s.getRootNode();        // the root node of the site
	var stack = [root];                // stack used for dfs search
	var runningAjaxCount = 0;          // the current ajax count
	var totalAjaxCount = 0;            // the total current ajax count
	var startTime = new Date();        // time the scan began
	var maxvisitAJAX = 10;             // the max ajax request in a row
	var active = false;                // if the crawler is currently crawling

	this.scan = function() {
		DFSScan();
		active = true;
		console.log("Started crawling: " + root.getName());
	};

	this.active = function() {
		return active;
	};
	
	this.getObj = function() {
		return {
			data : root,
			stackCount : stack.length,
			runningAjaxCount : runningAjaxCount,
			totalAjaxCount : totalAjaxCount,
			startTime : startTime,
			duration : (new Date()) - startTime,
			maxvisitAJAX : maxvisitAJAX,
			active : active
		};
	};

	var DFSScan = function() {
		
		// only process if something in stack
		if (stack.length == 0) {
			return;
		}
		// don't go past time allocated
		if (runningAjaxCount >= maxvisitAJAX) {
			runningAjaxCount = 0;
			active = false;
			return;
		}
		
		// get last item in stack
		var v = stack[stack.length - 1];
		
		// if not started processing
		if (v.getloopChild() == -1) { 
			// mark as started processing
			v.setloopChild(0);   
			
			// increment counters
			runningAjaxCount += 1;
			totalAjaxCount += 1;
			
			// start downloading the data
			v.downloadData({
				finished : function(children) {
					Array.prototype.push.apply(stack, children);
					
					// continue crawling
					DFSScan();
				},
				httpError : function(data) {
					
					// continue crawling
					DFSScan();
				},
				parseError: function(data) {
					
					// continue crawling
					DFSScan();
				}
			});
			
		// if finished processing
		} else if (v.done()) {
		
			var children = v.getChildren();
			var targetIndex = v.getloopChild();
			
			// if child index pointing to a valid child
			if (targetIndex < children.length) {
				
				stack.push(children[targetIndex]);
				v.setloopChild(targetIndex + 1);
				
			// no more children, so remove from stack
			} else {
				stack.splice(stack.length - 1, 1);
			}
			
			// continue crawling
			DFSScan();
			
		// if failed
		} else if (v.failed()) {
			
			// node failed to remove from stack
			stack.splice(stack.length - 1, 1);
			
			// continue crawling
			DFSScan();
			
		// currently still processing?
		} else {
			console.log("Node still processing?");
		}			
	}
};