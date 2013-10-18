/*
 * KularJS ver.0.0.1
 * 
 * Copyright 2013.10 SeungHyun PAEK, HangHee Yi.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * GitHub : https://github.com/tipJS-Team/KularJS
 * HomePage : http://tipjs-team.github.io/KularJS/
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
			if(util__.isFunction(window[ctrlName])){
				window[ctrlName]($this.__$scope);
			}
			$this.__tpls = [];
			// tpls
			__setTpls($this);
			// models
			__setModels($this);
		});
	}

	/*
	 * __setModels
	 */
	var __setModels = function($parent){
		//if ($parent.__$parent) return;
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
			var handlerKey = __getKeyHandler($parent, mdlName);
			$model.on("keyup", handlerKey);
			__renderByModel($parent, mdlName);
			// /모델 타이별 분기
		});
	}

	/*
	 * __setTpls
	 */
	var __setTpls = function($parent){
		$parent.__$tplNodes = $($parent).find('*').contents().filter(function(idx) {
			return this.nodeType === 3
					&& this.nodeValue
					&& this.nodeValue.trim() != ""
					&& this.nodeValue.indexOf("{{") > -1
					&& this.nodeValue.indexOf("}}") > 2; //Node.TEXT_NODE
		});
		$parent.__$tplNodes.each(function(idx, el){
			var nodeValue = this.nodeValue;
			var opt = {};
			opt.tpl = nodeValue;
			opt.models = __getModelNames(nodeValue);
			$parent.__tpls.push(opt);
			//console.log('model : ', model);
		});
	}

	var __setRelationNode = function($app){
		// controller
		for (ctrlName in $app.$controllers){
			var $ctrl = $app.$controllers[ctrlName];
			if ($ctrl.__$parent) continue;
			// controller > model
			for (mdlName in $ctrl.__$models){
				var regEx = new RegExp("\{\{"+mdlName+"\}\}", "g");
				var model = $ctrl.__$models[mdlName];
				model.__relation = [];
				// 최상위 컨트롤러 스코프
				$($ctrl).find('*').contents().each(function(idx, el){
					var node = this;
					// text node
					if (node.nodeType === 3) {
						// match
						if (node.nodeValue.match(regEx)){
							model.__relation.push(node);
						}
					} else {
						// is data-model
						if($(node).attr("data-model") == mdlName) {
							model.__relation.push(node);
						} else {
							// attr
							for(var i=node.attributes.length; i--;) {
								var attr = node.attributes[i];
								if (attr.value.match(regEx)){
									model.__relation.push(node);
									break;
								}
							}
						}
					}
				});
			}
		}
	}



	/*
	 * __init
	*/
	var __init = function() {
		console.log("### This is the APP!!!");
		$('html').hide();
		// app
		$this = __appRoot.$app = __appRoot.$appEl = $('[data-app]');
		// app 복사본
		__appRoot.$appCopyEl = $this.clone();
		if ($($this).find('[data-controller]').length) {
			__appRoot.hasController = true;
			__appRoot.$app.$controllers = {};
			__setController($this);
			__setRelationNode($this);
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
	 * __getModelTplObj
	 */
	var __getModelTplObj = function(modelName, obj) {
		for (var i=obj.__tpls.length; i--;){
			var opt = obj.__tpls[i];
			for (var j=opt.models.length; j--;){
				if (opt.models[j] == modelName) return opt;
			}
		}
		return;
	}

	/*
	 * __getKeyHandler
	 */
	var __getKeyHandler = function($curruntApp, mdlName) {
		return function($e){
			__onModelChange($curruntApp, mdlName);
			__renderByModel($curruntApp, mdlName);
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
		// 하위 컨트롤러가 있으면
		if ($currentApp.$controllers) {
			$.each($currentApp.$controllers, function(idx, el){
				$this = $(this);
				__onModelChange($this, mdlName);
			});
		}
	};

	/*
	 * __renderByModel
	 */
	var __renderByModel = function($curruntApp, mdlName){
		$curruntApp.__$tplNodes.each(function(idx, el){
			if (!$curruntApp.__tpls[idx].tpl.match(new RegExp("\{\{"+mdlName+"\}\}", "g"))) return;
			var tplObj = __getModelTplObj(mdlName, $curruntApp);
			if (!tplObj) return;
			var tpl = tplObj.tpl;
			for (var i=tplObj.models.length; i--;){
				var model = tplObj.models[i];
				var val = $('[data-model='+model+']').val();
				if (!val) continue;
				var reg = new RegExp("\{\{"+model+"\}\}", "g");
				tpl = tpl.replace(reg, val);
			}
			this.nodeValue = tpl;
		});
	}

	// 앱은 하나만 존재한다고 치자
	if ($('[data-app]').length == 1) {
		__init();
	}
});
