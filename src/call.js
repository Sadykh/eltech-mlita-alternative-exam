var width = 960,
    height = 500;

var cola = cola.d3adaptor()
    .size([width, height]);

var graph = {
    "nodes": [],
    "links": []
};

var colorsLinks = {};           // связь вершины и номера цвета
var colorsStorage = [0];        // все используемые цвета
var usedColorsInGroup = [];     // использованные цвета, чтобы не было дублей

/**
 * Генерация связи вершин на основе матрицы смежности
 */
function generateLinks() {
    graph.links = [];
    $('.adjacency_matrix_content input:checked').each(function () {
        graph.links.push({
            "source": $(this).data('row'),
            "target": $(this).data('col')
        });
    });
}

/**
 * Заполнения массива на основе введенного количества вершин в форме ввода
 * @param count
 */
function generateNodes(count) {
    graph.nodes = [];
    for (var i = 0; i < count; i++)
        graph.nodes[i] = {"name": i};
    generateLinks();
}

/**
 * Генерация чекбоксов для матрицы смежности
 * @param blockContent
 * @param count
 */
function generateInputs(blockContent, count) {
    for (var i = 0; i < count; i++) {
        var content = '<div class="adjacency_matrix_block_' + i + '">';
        content += '<span class="label label-primary">' + i + ' вершина:</span> ';
        for (var j = 0; j < count; j++) {
            var disable = '';
            var uname = 'adjacency_matrix_checkbox[' + i + '][' + j + ']';
            if (i == j) {
                disable = 'disabled readonly';
            }
            content += '<label class="checkbox-inline"><input data-row="' + i + '" data-col="' + j + '" type="checkbox" id="' + uname + '" value="1"' + disable + '> ' + j + '</label>';
        }
        content += '</div>';
        blockContent.append(content);
    }
}

/**
 * Фильтрация цвета, чтобы использовался самый минимальный цвет без повторения
 * @returns {number}
 */
function filterColor() {
    var i;
    for (i = 0; i < colorsStorage.length; i++) {
        if (usedColorsInGroup.indexOf(colorsStorage[i]) < 0) {
            return colorsStorage[i];
        }
    }
    var generateColor = colorsStorage[colorsStorage.length - 1] + 1;
    colorsStorage.push(generateColor);
    return generateColor;

}

$(document).ready(function () {
    /**
     * Генерация визуальной части графа
     */
    function generateGraph() {
        colorsLinks = {};
        colorsStorage = [0];
        usedColorsInGroup = [];
        generateNodes($('form.form-generate-nodes #nodes').val());

        $('.area_graph svg').html('');

        cola
            .nodes(graph.nodes)
            .links(graph.links)
            .jaccardLinkLengths(90, 5.7)
            .start(2);

        var link = svg.selectAll(".link")
            .data(graph.links)
            .enter().append("line")
            .attr("class", "link");

        /**
         * Объекты с массивами.
         * Вершина => массив вершин, с которыми соединена текущая вершина
         * @type {{}}
         */
        var links = {};
        $.each(graph.links, function (index, value) {
            var node = value.target.index;
            if (links[node] === undefined) {
                links[node] = [];
            }
            links[node].push(value.source.index);
        });


        /**
         * Массив.
         * Сортируем вершины по мощности.
         * В массиве ["id вершины", "количество связей"]
         */
        var sortList = [];
        for (var i in links) {
            sortList.push([i, links[i].length]);
        }
        sortList.sort(function (a, b) {
            if (a[1] < b[1])
                return 1;
            if (a[1] > b[1])
                return -1;
            return 0;
        });

        /**
         * Обработка скопившейся очереди вершин.
         * Такое бывает, когда мы смотрим одну вершину, а её ребра не обработаны. Чтобы следующими именно ребро обрабатывались.
         * @param queue
         */
        function processQueue(queue) {
            for (var i = 0; i < queue.length; i++) {
                processSingleNode(queue[i]);
            }
        }

        /**
         * Обработка одной вершины
         * @param node
         */
        function processSingleNode(node) {
            var queueProcess = [];
            if (colorsLinks[node] === undefined) {
                usedColorsInGroup = [];
                for (var j in links[node]) {
                    var node_id = links[node][j];
                    if (node_id in colorsLinks) {
                        usedColorsInGroup.push(colorsLinks[node_id]);
                    } else {
                        queueProcess.push(node_id);
                    }
                }
                colorsLinks[node] = filterColor();
                processQueue(queueProcess);
            }
        }

        /**
         * Обход графа. Обходит все вершины, по пути смотрит - если в процессе уже вершина обработана, то пропускает.
         */
        function processNodes() {
            for (var i = 0; i < sortList.length; i++) {
                processSingleNode(sortList[i][0]);
            }
        }

        processNodes();

        var node = svg.selectAll(".node")
            .data(graph.nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 20)
            .style("fill", function (d) {
                return color(colorsLinks[d.index]);
            })
            .call(cola.drag);

        var label = svg.selectAll(".label")
            .data(graph.nodes)
            .enter().append("text")
            .attr("class", "label")
            .text(function (d) {
                return d.name;
            })
            .call(cola.drag);


        node.append("title")
            .text(function (d) {
                return d.name;
            });

        cola.on("tick", function () {
            link.attr("x1", function (d) {
                    return d.source.x;
                })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });

            node.attr("cx", function (d) {
                    return d.x;
                })
                .attr("cy", function (d) {
                    return d.y;
                });

            label.attr("x", function (d) {
                    return d.x - 3;
                })
                .attr("y", function (d) {
                    var h = this.getBBox().height;
                    return d.y + h / 4;
                });

        });
    }

    var color = d3.scale.category20();
    var svg = d3.select('body')
        .selectAll(".area_graph")
        .append('svg')
        .attr("width", width)
        .attr("height", height);

    /**
     * Реакция на кнопку "сгенерировать граф"
     */
    $(document).on('submit', 'form.form-generate-graph', function (e) {
        generateGraph();
        $(this).find('button').removeClass('btn-primary').addClass('btn-success');
        e.preventDefault();
    });

    /**
     * Реакция на кнопку "сгенерировать вершины"
     */
    $(document).on('submit', 'form.form-generate-nodes', function (e) {
        var count = $(this).find('#nodes').val();
        var blockContent = $('.adjacency_matrix_content');
        if (count > 0 && count <= 20) {
            blockContent.html('');
            generateInputs(blockContent, count);
            $(this).find('.alert').remove();
            $(this).find('button').removeClass('btn-primary').addClass('btn-success');
        } else {
            var errorInfo = '<div class="alert alert-danger" role="alert">Количество должно быть от 0 до 20</div>';
            $(this).find('.form-group').after(errorInfo);
        }
        e.preventDefault();
    });

    /**
     * Реакция на нажатие чекбоксов.
     * Чтобы направления графов были в обе стороны - так проще обрабатывать.
     */
    $(document).on('change', '.adjacency_matrix_content input[type=checkbox]', function (e) {
        var row = $(this).data('row');
        var col = $(this).data('col');
        $('input[data-col="' + row + '"][data-row="' + col + '"]').prop("checked", this.checked);
        $('.adjacency_matrix button').removeClass('btn-success').addClass('btn-primary');
        generateLinks();
    });

    /**
     * Реакция кнопки на изменение количества вершин
     */
    $(document).on('change', '.form-generate-nodes #nodes', function (e) {
        $(this).parent().parent().find('button').removeClass('btn-success').addClass('btn-primary');
    });

});
