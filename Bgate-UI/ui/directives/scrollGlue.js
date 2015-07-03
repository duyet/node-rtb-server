function fakeNgModel(initValue){
	return {
		$setViewValue: function(value){
			this.$viewValue = value;
		},
		$viewValue: initValue
	};
};

module.exports = [function() {
	return {
		priority: 1,
		require: ['?ngModel'],
		restrict: 'A',
		link: function(scope, $el, attrs, ctrls){
			var el = $el[0],
				ngModel = ctrls[0] || fakeNgModel(true);

			function scrollToBottom(){
				el.scrollTop = el.scrollHeight;
			}

			function shouldActivateAutoScroll(){
				// + 1 catches off by one errors in chrome
				return el.scrollTop + el.clientHeight + 1 >= el.scrollHeight;
			}

			scope.$watch(function(){
				if(ngModel.$viewValue){
					scrollToBottom();
				}
			});

			$el.bind('scroll', function(){
				scope.$apply(ngModel.$setViewValue.bind(ngModel, shouldActivateAutoScroll()));
			});
		}
	};
}];
