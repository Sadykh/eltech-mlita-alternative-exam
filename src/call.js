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



$(document).ready(function () {
    var logPaint = $('.logs_graph_paints ol');

    /**
     * Фильтрация цвета, чтобы использовался самый минимальный цвет без повторения
     * @returns {number}
     */
    function filterColor() {
        var i;
        logPaint.append('<li>Доступные цвета для покраски: ' + colorsStorage + '</li>');
        if (usedColorsInGroup.length) {
            logPaint.append('<li>Следующие цвета нельзя использовать, так как соседние вершины уже имеют эти цвета: ' + usedColorsInGroup + '</li>');
        }
        for (i = 0; i < colorsStorage.length; i++) {
            logPaint.append('<li>Проверка цвета <span class="js-color-update" data-color="' + i +'">' + i + '</span> в списке использованных</li>');
            if (usedColorsInGroup.indexOf(colorsStorage[i]) < 0) {
                logPaint.append('<li>Цвет <span class="js-color-update" data-color="' + i +'">' + i + '</span> не использован</li>');
                return colorsStorage[i];
            }
            logPaint.append('<li>Цвет <span class="js-color-update" data-color="' + i +'">' + i + '</span> использован</li>');
        }
        var generateColor = colorsStorage[colorsStorage.length - 1] + 1;
        colorsStorage.push(generateColor);
        logPaint.append('<li>Свободных цветов не нашлось, добавлен новый цвет: <span class="js-color-update" data-color="' + generateColor +'">' + generateColor + '</span></li>');
        return generateColor;

    }


    /**
     * Генерация визуальной части графа
     */
    function generateGraph() {
        colorsLinks = {};
        colorsStorage = [0];
        usedColorsInGroup = [];
        generateNodes($('form.form-generate-nodes #nodes').val());

        $('.area_graph').html('');

        var color = d3.scale.category10();
        var svg = d3.select('body')
            .selectAll(".area_graph")
            .append('svg')
            .attr("width", width)
            .attr("height", height);

        var g = svg.append("g");

        // then, create the zoom behvavior
        var zoom = d3.behavior.zoom()
            // only scale up, e.g. between 1x and 50x
            .scaleExtent([-8, 50])
            .on("zoom", function() {
                // the "zoom" event populates d3.event with an object that has
                // a "translate" property (a 2-element Array in the form [x, y])
                // and a numeric "scale" property
                var e = d3.event,
                // now, constrain the x and y components of the translation by the
                // dimensions of the viewport
                    tx = Math.min(0, Math.max(e.translate[0], width - width * e.scale)),
                    ty = Math.min(0, Math.max(e.translate[1], height - height * e.scale));
                // then, update the zoom behavior's internal translation, so that
                // it knows how to properly manipulate it on the next movement
                zoom.translate([tx, ty]);
                // and finally, update the <g> element's transform attribute with the
                // correct translation and scale (in reverse order)
                g.attr("transform", [
                    "translate(" + [tx, ty] + ")",
                    "scale(" + e.scale + ")"
                ].join(" "));
            });

        // then, call the zoom behavior on the svg element, which will add
        // all of the necessary mouse and touch event handlers.
        // remember that if you call this on the <g> element, the even handlers
        // will only trigger when the mouse or touch cursor intersects with the
        // <g> elements' children!
        svg.call(zoom);

        cola
            .nodes(graph.nodes)
            .links(graph.links)
            .jaccardLinkLengths(90, 5.7)
            .start(2);

        var link = g.selectAll(".link")
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

        $('.logs_graph_sorting_before ol li').remove();
        $.each(links, function(index, value) {
            $('.logs_graph_sorting_before ol').append('<li>Вершина #' + index + ', ребра: ' + value);
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

        // Вывод отсортированного списка
        $('.logs_graph_sorting_after ol li').remove();
        $.each(sortList, function(index, value) {
            $('.logs_graph_sorting_after ol').append('<li>Вершина #' + value[0] + ', количество ребер: ' + value[1]);
        });

        $('.logs_graph_paints li').remove();

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
            logPaint.append('<li>Просмотр вершины #' + node + '</li>');
            if (colorsLinks[node] === undefined) {
                usedColorsInGroup = [];
                logPaint.append('<li>Стек использованных цветов очищен</li>');
                for (var j in links[node]) {
                    var node_id = links[node][j];
                    if (node_id in colorsLinks) {
                        logPaint.append('<li>Вершина #' + node_id + ' уже имеет цвет <span class="js-color-update" data-color="' +  colorsLinks[node_id] +'">' +  colorsLinks[node_id] + '</span>, его цвет добавлен в список уже использованных.</li>');
                        usedColorsInGroup.push(colorsLinks[node_id]);
                    } else {
                        logPaint.append('<li>Вершина #' + node_id + ' добавлена в очередь на покраску.</li>');
                        queueProcess.push(node_id);
                    }
                }
                colorsLinks[node] = filterColor();
                logPaint.append('<li>Вершине #' + node + ' назначен цвет <span class="js-color-update" data-color="' +  colorsLinks[node] +'">' +  colorsLinks[node] + '</span></li>');
                processQueue(queueProcess);
            } else {
                logPaint.append('<li>Вершина #' + node + ' уже имеет цвет ' + colorsLinks[node] + '</li>');
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

        var node = g.selectAll(".node")
            .data(graph.nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 20)
            .style("fill", function (d) {
                return color(colorsLinks[d.index]);
            })
            .call(cola.drag);

        var label = g.selectAll(".label")
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

        $(".js-color-update").each(function (index, element) {
            var colorId = $(this).data('color');
            $(this).css({background: color(colorId)});
        });
    }




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
        $(this).find('.alert').remove();
        if (count > 0 && count <= 20) {
            blockContent.html('');
            generateInputs(blockContent, count);
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
