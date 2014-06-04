angular.module("google-chart-sample").controller("GenericChartCtrl", function ($scope, $routeParams) {
    $scope.chartObject = {};

    $scope.onions = [
        {v: "Onions"},
        {v: 20},
    ];

    $scope.chartObject.data = {"cols": [
        {id: "t", label: "Topping", type: "string"},
        {id: "s", label: "Slices", type: "number"}
    ], "rows": [
        {c: [
            {v: "Olives"},
            {v: 31}
        ]},
        {c: $scope.onions},
        {c: [
            {v: "Zucchini"},
            {v: 1},
        ]},
        {c: [
            {v: "Pepperoni"},
            {v: 2},
        ]},
        {c: [
            {v: "머쉬롬"},
            {v: 10},
        ]},
    ]};


    // $routeParams.chartType == BarChart or PieChart or ColumnChart...
    $scope.chartObject.type = $routeParams.chartType;
    $scope.chartObject.options = {
        'title'  : 'How Much Pizza I Ate Last Night',
        'colors' : ['#e0440e', '#e6693e', '#ec8f6e', '#f3b49f', '#f6c7b6']
    }
});

