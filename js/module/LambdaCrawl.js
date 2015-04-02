/*!
 * Lambda Aggregator v0.0.2
 * http://lambdaaggregation.com/
 *
 * Developers: Ryan Steve D'Souza
 * http://www.linkedin.com/profile/view?id=282676120
 *
 * Copyright 2015
 *
 * Date: 2015
 */

module.exports = function(s) {

	var site = s;                      // the site object
	var root = s.getRootNode();        // the root node of the site
	var stack = [root];                // stack used for dfs search
	var runningAjaxCount = 0;          // the current ajax count
	var totalAjaxCount = 0;            // the total current ajax count
	var startTime = new Date();        // time the scan began
	var endTime = null;                // time of supposed complete
	var maxvisitAJAX = 10;             // the max ajax request in a row
	var checkTimes = 0;                // number of times it was checked
	var concurrentAjaxCalls = 4;       // number of ajax calls at same time

	this.scan = function() {
		runningAjaxCount = 0;
		DFSScan();
		console.log("Started crawling: " + root.getName());
	};
	
	this.getcheckTimes = function() {
		return checkTimes;
	};
	
	this.incrementcheckTimes = function() {
		checkTimes += 1;
	};
	
	this.getStackSize = function() {
		return stack.length;
	};
	
	this.getEndTime = function() {
		return endTime;
	};
	
	this.setEndTime = function() {
		endTime = new Date();
	};
	
	this.hitLimit = function() {
		return runningAjaxCount >= maxvisitAJAX;
	};
	
	var DFSScan = function() {
		
		// don't go past time allocated
		if (runningAjaxCount >= maxvisitAJAX) {
			return;
		}
		
		// loop for every concurrent ajax call
		var l = stack.length, fromIndex = l - 1, toIndex = Math.max(0, l - concurrentAjaxCalls);
		for(i = fromIndex; i >= toIndex; i -= 1) {

			// get last item in stack
			var v = stack[i];
			
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
					stack.splice(i, 1);
				}
				
				// continue crawling
				DFSScan();

			// if failed
			} else if (v.failed()) {
				
				// node failed to remove from stack
				stack.splice(i, 1);
				
				// continue crawling
				DFSScan();
			}
		}
	};
	
	this.toJSON = function() {
		return {
			url : site.getURL(),
			root : root,
			stackCount : stack.length,
			runningAjaxCount : runningAjaxCount,
			totalAjaxCount : totalAjaxCount,
			startTime : startTime,
			duration : endTime==null ? (new Date()) - startTime : endTime - startTime,
			complete : endTime!=null,
			maxvisitAJAX : maxvisitAJAX,
			checkTimes : checkTimes,
			concurrentAjaxCalls : concurrentAjaxCalls
		};
	};
};