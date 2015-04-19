/*
 * FreePeople Site Module
 *
 * Developers: Ryan Steve D'Souza
 * http://www.linkedin.com/profile/view?id=282676120
 *
 * Copyright 2015
 *
 * Date: 2015
 */

// Load the cheerio module to parse html responses.
var $ = require('cheerio');
// Load my custom node object
var LambdaNode = require('../module/LambdaNode.js');
// Load my custom site object
var LambdaSite = require('../module/LambdaSite.js');
// Load my custom node object
var common = require('../common/common.js');

var url = "http://www.freepeople.com";

var nodes = [
	function(input) {
		return new LambdaNode(input.data, input, function(input, scanEvents, node) {
			node.downloadTemplate(input, scanEvents, function(body) {
				var parsedHTML = $.load(body);

				return parsedHTML("div.wl-navigation-banner li.link-item > a").map(function(i, x) { 
					var header = $(x);
					var link = header.attr("href");
					var tabName = header.text().trim();
					
					// filter high level categories
					if (tabName == "New" || tabName == "Dresses" || tabName == "accessories" || tabName == "Swim" || tabName == "sale" || tabName == "trends") {
						return;
					}
					//if (tabName != "clothes") {
					//	return;
					//}
					
					return (nodes[1])({
						data : link,
						name : tabName
					}); 
				});	
			});
		});
	},
	function(input) {
		return new LambdaNode(input.name, input, function(input, scanEvents, node) {
			node.downloadTemplate(input, scanEvents, function(body) {
				var parsedHTML = $.load(body);
		
				return parsedHTML("div#side-container li.link-item.link-group").eq(0).find("ul > li > a").map(function (i,x) {
					var header = $(x);
					var link = header.attr("href");
					var tabName = header.text().trim();
					
					//if (tabName != "Dresses") {
					//	return;
					//}
					
					return (nodes[2])({
						data : link,
						name : tabName
					}); 
				});
			});
		});
	},
	function(input) {
		return new LambdaNode(input.name, input, function(input, scanEvents, node) {
			node.downloadTemplate(input, scanEvents, function(body) {
				var parsedHTML = $.load(body);

				// get the link to the button to view all products at same time, if it exists
				var viewAllButton = parsedHTML("a:contains('View All')");
				var linkToAll = viewAllButton.length <= 1 ? input.data : url + viewAllButton.last().attr("href");
		
				return [(nodes[3])({
					data : linkToAll,
					name : "Full Page"
				})]; 
			});
		});
	},
	function(input) {
		return new LambdaNode(input.name, input, function(input, scanEvents, node) {
			node.downloadTemplate(input, scanEvents, function(body) {
				var parsedHTML = $.load(body);

				return parsedHTML("li.thumbnail--large.thumbnail").map(function(i, x) {
					var item = $(x);
					
					// find name
					name = item.find("h3.name").text().trim();
					
					// find product url
					link = item.find("div.media > a").attr("href");
					
					return (nodes[4])({
						data : link,
						name : name
					}); 
				});
			});
		});
	},
	function(input) {
		return new LambdaNode(input.name, input, function(input, scanEvents, node) {
			node.downloadTemplate(input, scanEvents, function(body) {
				var parsedHTML = $.load(body);
				var metadata = parsedHTML("div.metadata");
				
				// product id
				var id = metadata.find("span").text().trim();
				
				// image list
				// this part reads the variation image links and names and puts them into objects
				var match = body.match(/productImages\['[\w|-]+'\]\["[\w|-]+"\]\["[\w]"\]\["(\w+)"\] = "(.*)";/g), i, l=match.length, mainList = [], obj = {};
				for(i=0; i<l; i+=1) {
					var str = match[i];
					var new_match = str.match(/\["(\w+)"\] = \"(.*)"/);
					
					var prop = new_match[1]
					var val = new_match[2];
					
					if (prop == "aliasName" || prop == "optionName") {
						obj[prop] = val;
					}
					if (prop == "detailSize") {
						obj["image_links"] = [val];
						
						mainList.push(obj);
						obj = {};
					}
				}
			
				// this part groups the objects in a meaningful way
				l=mainList.length;
				for(i=l-1; i>0; i-=1) {
					var last = mainList[i];
					var before_last = mainList[i-1];
					
					if (last["aliasName"] == before_last["aliasName"]) {
						before_last["image_links"] = before_last["image_links"].concat(last["image_links"]);
						mainList.splice(i, 1);
					}
				}
				
				// price
				var priceTag = parsedHTML("dd.price");
				var price = priceTag.find("span.dollars").text() + priceTag.find("sup.cents").text();

				// desc
				var long_desc = parsedHTML("div.long-desc").text();
				var material_desc = parsedHTML("div.care-desc").text();
				var sizing_desc = parsedHTML("div.sizing-desc").text();
				
				// link to stock
				var link = parsedHTML("a.more-info.availability.dialog").attr("href");
				
				return [(nodes[5])({
					data : link,
					name : "Stock",
					url : input.data,
					id : id,
					variations : mainList,
					price : price,
					long_desc : long_desc,
					material_desc : material_desc,
					sizing_desc : sizing_desc
				})]; 
			});
		});
	},
	function(input) {
		return new LambdaNode(input.name, input, function(input, scanEvents, node) {
			node.downloadTemplate(input, scanEvents, function(body) {
				var parsedHTML = $.load(body);
				
				// gets all rows of stock info, and groups them up into objects
				var tablerows = parsedHTML("table.row-data > tbody > tr"), i, j, k, q, w, l=tablerows.length, lst, mainlst = [];
				for(i=0; i<l; i+=1) {
					var row = $(tablerows[i]);
					if (row.hasClass("first")) {
						lst = [row];
					} else if (row.hasClass("last")) {
						lst.push(row);
						mainlst.push(lst);
					} else {
						lst.push(row);
					}
				}

				// this part adds the stock/size info to each variation
				for(i=0; i<mainlst.length; i+=1) {
					var items = mainlst[i];
					for(j=0; j<items.length; j+=1) {
						var item = items[j];
						
						if (j==0) {
							q = null;
							
							var img = item.find("img");
							var swatch_link = img.attr("src");
							var alias_name = img.attr("alt");
							
							for(k=0; k<input.variations.length; k+=1) {
								w = input.variations[k];
								if (w["aliasName"] == alias_name) {
									w["swatch_link"] = swatch_link;
									w["sizes"] = [];
									q = w;
									break;
								}
							}
							
							if (q == null) {
								break;
							}
						}
						
						var size = item.find("td.item-size").text().trim();
						var raw_stock = item.find("td.item-availability").text().trim();
						
						var stock = raw_stock.match(/(\d+-\d+|\d+)/);
						stock = stock==null || stock.length == 0 ? 0 : stock[0];
						var hasMore = raw_stock.indexOf("+") != -1;
						
						q["sizes"].push({
							size : size,
							stock : stock,
							hasMore : hasMore
						});
					}
				}

				// mark as leaf
				node.addmetadata("leaf", true);
				
				// add data to node metadata
				node.addmetadata("url", input.url);
				node.addmetadata("id", input.id);
				node.addmetadata("variations", input.variations);
				node.addmetadata("price", input.price);
				node.addmetadata("long_desc", input.long_desc);
				node.addmetadata("material_desc", input.material_desc);
				node.addmetadata("sizing_desc", input.sizing_desc);

				return [];
			});
		});
	}
];

module.exports = new LambdaSite(url, 60, 4, nodes);