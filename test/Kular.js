/*
 * KularJS ver.0.0.1
 * 
 * Copyright 2013.10 SeungHyun PAEK, HangHee Yi.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * GitHub : https://github.com/tipJS-Team/KularJS
 * HomePage : http://tipjs-team.github.io/KularJS/
 */


/*
 MutationEvent
 DOMNodeInserted
 DOMNodeRemoved
 DOMSubtreeModified
*/
if(typeof String.prototype.trim !== 'function') {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

var util__ = {};
// Type Check [ecmascript 15.2.4.2] 참조
var __protoToString = Object.prototype.toString;
var types = [ 'Arguments', 'Function', 'Number', 'String', 'Date', 'RegExp', 'Boolean' ],
	checker = function(type) {
		util__['is' + type] = function(obj) {
			return __protoToString.call(obj) === '[object ' + type + ']';
		};
	};
for(var t = 0,len = types.length; t < len; t++) {
	checker(types[t]);
}

/*
	Boot KularJS
	Require JQuery
*/
var __appRoot = {
	$app:{}
};
$(function(){

	/*
	 * __setController
	 */
	var __setController = function($parent){
		var $controlEls = $($parent).find('[data-controller]');
		$controlEls.each(function(idx, el){
			var $this = $(this);
			var ctrlName = $this.attr('data-controller');
			__appRoot.$app.$controllers[ctrlName] = $this;
			
			// 자신보다 최상위 컨트롤러를 지정
			$this.__$parent = __appRoot.$app.$controllers[$($this).parents('[data-controller]:last').attr('data-controller')];
			$this.__$models = $this.__$parent ? $this.__$parent.__$models : {};
			$this.__$scope = $this.__$parent ? $this.__$parent.__$scope : {};
			$this.__tpls = [];
			
			if(util__.isFunction(window[ctrlName])){
				window[ctrlName]($this.__$scope);
			}
			__makeDomLoop($this);
			//return;
			// tpls
			__setTpls($this);
			// models
			__setModels($this);
			//__renderByModel($this);
		});
	}

	var __makeDomLoop = function($app){
		if ($app.__$parent) return;
		var $scope = $app.__$scope;
		$("[data-loop]").each(function(idx, el){
			//list in lists
			var $this = $(this);
			var loopEx = $this.attr("data-loop");
			var loopExs = loopEx.split("in");
			if (loopExs.length != 2 || !$scope[loopExs[1].trim()]) return;
			var loopLen = $scope[loopExs[1].trim()].length;
			var $child = $this.contents();
			var $childCopy = $child.clone();
			$child.remove();
			for (var i=0; i<loopLen; i++){
				$this.append($childCopy.clone());
			}
		});
	}

	/*
	 * __setModels
	 */
	var __setModels = function($parent){
		// 최상위 컨트롤러만 모델을 갖음
		if (!$parent.__$parent) return;
		var $models = $($parent).find('[data-model]');
		$models.each(function(idx, el) {
			var $model = $(this);
			var mdlName = $model.attr('data-model');
//			$model.attr("*", function(idx, attr){
//				console.dir(attr);
//			});
			$parent.__$models[mdlName] = $model;
			// 모델 타입별 분기
			if ($parent.__$scope[mdlName]) {
				$model.val($parent.__$scope[mdlName]);
			} else {
				$parent.__$scope[mdlName] = $model.val();
			}
			// model 이벤트 등록
			var handlerKey = __getKeyHandler($parent);
			$model.on("keyup", handlerKey);
			// /모델 타이별 분기
		});
	}

	/*
	 * __setTpls
	 */
	var __setTpls = function($parent){
		// 최상위 컨트롤러만 처리
		if ($parent.__$parent) return;
		$parent.__$tplNodes = $($parent).find('*').contents().filter(function(idx) {
			if (this.nodeType == 3) {
				return this.nodeValue
						&& this.nodeValue.trim() != ""
						&& this.nodeValue.indexOf("{{") > -1
						&& this.nodeValue.indexOf("}}") > 2;
			} else {
				// is data-model
				if($(this).attr("data-model")) {
					return true;
				} else {
					// attr
					for(var i=this.attributes.length; i--;) {
						var attr = this.attributes[i];
						if (attr.value
							&& attr.value.trim() != ""
							&& attr.value.indexOf("{{") > -1
							&& attr.value.indexOf("}}") > 2){
							return true;
						}
					} // for
				}
				//return false;
			} // else
		});
		
		$parent.__$tplNodes.each(function(idx, el){
			var opt = {};
			if (this.nodeType == 3) {
				opt.models = __getModelNames(this.nodeValue);
				$parent.__tpls.push(opt);
			} else {
				var valStr = "";
				// is data-model
				if($(this).attr("data-model")) {
					valStr += "{{"+$(this).attr("data-model")+"}}";
				}
				// attr
				for(var i=this.attributes.length; i--;) {
					var attr = this.attributes[i];
					valStr += attr.value;
				} // for
				opt.models = __getModelNames(valStr);
				$parent.__tpls.push(opt);
			}
		});
		$parent.__$tplNodesCopy = $parent.__$tplNodes.clone();
	}

	/*
	 * __init
	*/
	var __init = function() {
		console.log("### This is the APP!!!");
		$('html').hide();
		// app
		var $this = __appRoot.$app = __appRoot.$appEl = $('[data-app]');
		// app 복사본
		__appRoot.$appCopyEl = $this.clone();
		if ($($this).find('[data-controller]').length) {
			__appRoot.hasController = true;
			__appRoot.$app.$controllers = {};
			__setController($this);
			$.each(__appRoot.$app.$controllers, function(idx, el){
				__renderByModel(this);
			});
		} else {
			$this.__$models = {};
			$this.__$scope = {};
			$this.__tpls = [];
			// tpls
			__setTpls($this);
			// models
			__setModels($this);
		}
		console.dir(__appRoot);
		$('html').show();
	}

	/*
	 * __getModelNames
	 */
	var __getModelNames = function(str){
		var ret = [];
		var sp = str.split("}}");
		for(var i=sp.length; i--;){
			if (sp[i].indexOf("{{") > -1) {
				var sp2 = sp[i].split("{{");
				if(sp2[1].trim())ret.push(sp2[1]);
			}
		}
		return ret;
	}

	/*
	 * __getKeyHandler
	 */
	var __getKeyHandler = function($curruntApp) {
		return function($e){
			$.each($curruntApp.__$models, function(idx, el){
				var mdlName = $(this).attr('data-model');
				__onModelChange($curruntApp, mdlName);
			});
			__renderByModel($curruntApp);
		};
	};

	/*
	 * __onModelChange
	 */
	var __onModelChange = function($currentApp, mdlName){
		// 앱이 존재하지 않으면 종료
		if (!$currentApp) return;
		// 스코프가 존재하면
		if ($currentApp.__$scope && $currentApp.__$scope[mdlName]){
			$currentApp.__$scope[mdlName] = $('[data-model='+mdlName+']').val();
		}
	};

	/*
	 * __renderByModel
	 */
	var __renderByModel = function($curruntApp){
		if ($curruntApp.__$parent) return;
		var $tplNodes = $curruntApp.__$tplNodesCopy;
		if (!$tplNodes) return;
		$tplNodes.each(function(idx, el){
			console.log(idx);
			var node = this;
			var nodeCopy = $(this).clone()[0];
			var nodeOrg = $curruntApp.__$tplNodes[idx];
			var models = $curruntApp.__tpls[idx].models;
			
			if (node.nodeType == 3) {
				nodeOrg.nodeValue = node.nodeValue;
			} else {
				// attr
				for(var j=nodeOrg.attributes.length; j--;) {
					if (nodeOrg.attributes[j].name == "data-model") continue;
					nodeOrg.attributes[j].value = node.attributes[j].value;
				}
			}
			
			for (var i=models.length; i--;){
				var regEx = new RegExp("\{\{"+models[i]+"\}\}", "g");
				var modelVal = $('[data-model='+models[i]+']').val();
				console.log(models[i], modelVal);
				// text node
				if (nodeOrg.nodeType == 3) {
					// match
					if (nodeOrg.nodeValue.match(regEx)){
						nodeOrg.nodeValue = nodeOrg.nodeValue.replace(regEx, modelVal);
					}
				} else {
					// attr
					for(var j=nodeOrg.attributes.length; j--;) {
						if (nodeOrg.attributes[j].name == "data-model") continue;
						var attr = nodeOrg.attributes[j];
						if (attr.value.match(regEx)){
							attr.value = attr.value.replace(regEx, modelVal);
						}
					}
				}
			}
		});
	}

	// 앱은 하나만 존재한다고 치자
	if ($('[data-app]').length == 1) {
		__init();
	}
});
