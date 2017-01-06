var width = 960,
    height = 500;

var cola = cola.d3adaptor()
    .size([width, height]);

var graph = {
    "nodes": [],
    "links": []
};

var colorsLinks = {};                                           // связь вершины и номера цвета
var colorsStorage = [0];                                        // все используемые цвета
var usedColorsInGroup = [];                                     // использованные цвета, чтобы не было дублей
var alg;                                                        // какой алгоритм выбран
var stepColor;                                                   // сразу все отрисовывать или пошагово
var stepColorCount;                                             // сколько цветов отрисовано
var sortList = [];
var links = {};
var color = d3.scale.category10();

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
    var logPaint = $('.logs_graph_paints ol');  // куда мы записываем логи по записи

    $('.link-slow-scroll a[href*="#"]:not([href="#"])').click(function () {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            $('.link-slow-scroll .active').removeClass('active');
            $(this).parent().addClass('active');
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                $('html, body').animate({
                    scrollTop: target.offset().top - 80
                }, 1000);
                return false;
            }
        }
    });

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
            logPaint.append('<li>Проверка цвета <span class="js-color-update" data-color="' + i + '">' + i + '</span> в списке использованных</li>');
            if (usedColorsInGroup.indexOf(colorsStorage[i]) < 0) {
                logPaint.append('<li>Цвет <span class="js-color-update" data-color="' + i + '">' + i + '</span> не использован</li>');
                return colorsStorage[i];
            }
            logPaint.append('<li>Цвет <span class="js-color-update" data-color="' + i + '">' + i + '</span> использован</li>');
        }
        var generateColor = colorsStorage[colorsStorage.length - 1] + 1;
        colorsStorage.push(generateColor);
        logPaint.append('<li>Свободных цветов не нашлось, добавлен новый цвет: <span class="js-color-update" data-color="' + generateColor + '">' + generateColor + '</span></li>');
        return generateColor;

    }

    /**
     * Обновить все цвета
     */
    function updateAllColors() {
        $(".area_graph .node").each(function (index, element) {
            var number = $(this).data('number');
            var colorRgb;
            if (colorsLinks[number] == undefined) {
                colorRgb = '#cecece';
            } else {
                colorRgb = color(colorsLinks[number]);
            }
            $(this).css({fill: colorRgb});
        });

        $(".js-color-update").each(function (index, element) {
            var colorId = $(this).data('color');
            $(this).css({background: color(colorId)});
        });
    }

    /**
     * Алогоритм перебора с возвратом
     */
    function processPaint() {
        var unpainted = 1;
        var freeColor = 1;
        var count = 0;
        var k = 0;

        for (var i = 0; unpainted; i++) {
            if (stepColor) {
                i = stepColorCount;
                $('.step-color').slideDown();
            }
            logPaint.append('<li>' + 'Выбрали цвет <span class="js-color-update" data-color="' + i + '">' + i + '</span></li>');
            for (var j = 0; j < sortList.length; j++) {
                logPaint.append('<li>' + 'Хотим покрасить вершину #' + sortList[j][0] + '</li>');
                if (colorsLinks[sortList[j][0]] == undefined) {
                    logPaint.append('<li>' + 'Соседние вершины: ' + links[sortList[j][0]] + '</li>');
                    freeColor = 1;
                    for (k = 0; k < links[sortList[j][0]].length && freeColor; k++) {
                        logPaint.append('<li>' + 'Смотри вершину #' + links[sortList[j][0]][k] + ', у нее цвет номер <span class="js-color-update" data-color="' + colorsLinks[links[sortList[j][0]][k]] + '">' + colorsLinks[links[sortList[j][0]][k]] + '</span></li>');
                        if (colorsLinks[links[sortList[j][0]][k]] == i) {
                            freeColor = 0;
                        }
                    }
                    if (freeColor) {
                        logPaint.append('<li>' + 'Вершину #' + sortList[j][0] + ' красим в <span class="js-color-update" data-color="' + i + '">' + i + '</span></li>');
                        colorsLinks[sortList[j][0]] = i;
                        count++;
                    }
                } else {
                    logPaint.append('<li>' + 'Вершина #' + sortList[j][0] + ' уже имеет цвет.' + '</li>');
                }
            }
            if (stepColor || count == sortList.length) {
                logPaint.append('<li>Количество цветов совпадает с количество вершин.</li>');
                break;
            }
            colorsStorage.push(i);
        }
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

        var svg = d3.select('body')
            .selectAll(".area_graph")
            .append('svg')
            .attr("width", width)
            .attr("height", height);

        var g = svg.append("g");

        // then, create the zoom behvavior
        var zoom = d3.behavior.zoom()
            .scaleExtent([-8, 50])
            .on("zoom", function () {
                var e = d3.event,
                    tx = Math.min(0, Math.max(e.translate[0], width - width * e.scale)),
                    ty = Math.min(0, Math.max(e.translate[1], height - height * e.scale));
                zoom.translate([tx, ty]);
                g.attr("transform", [
                    "translate(" + [tx, ty] + ")",
                    "scale(" + e.scale + ")"
                ].join(" "));
            });

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
        links = {};
        $.each(graph.links, function (index, value) {
            var node = value.target.index;
            if (links[node] === undefined) {
                links[node] = [];
            }
            links[node].push(value.source.index);
        });

        var node = g.selectAll(".node")
            .data(graph.nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 20)
            .attr("data-number", function (d) {
                return d.index;
            })
            //.style("fill", function (d) {
            //    return color(colorsLinks[d.index]);
            //})
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


        $('.logs_graph_sorting_before ol li').remove();
        $.each(links, function (index, value) {
            $('.logs_graph_sorting_before ol').append('<li>Вершина #' + index + ', связанные вершины: ' + value);
        });


        /**
         * Массив.
         * Сортируем вершины по мощности.
         * В массиве ["id вершины", "количество связей"]
         */
        sortList = [];
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
        $('.logs_graph .empty_log').slideUp();
        $('.logs_graph_sorting').slideDown();
        $('.logs_graph_sorting_after ol li').remove();
        $.each(sortList, function (index, value) {
            $('.logs_graph_sorting_after ol').append('<li>Вершина #' + value[0] + ', количество связей: ' + value[1]);
        });

        $('.logs_graph_paints li').remove();
        $('.logs_graph_paints').slideDown();

        /**
         * Обработка скопившейся очереди вершин.
         * Такое бывает, когда мы смотрим одну вершину, а её вершины не обработаны. Чтобы следующими именно вершины обрабатывались.
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
                        logPaint.append('<li>Вершина #' + node_id + ' уже имеет цвет <span class="js-color-update" data-color="' + colorsLinks[node_id] + '">' + colorsLinks[node_id] + '</span>, его цвет добавлен в список уже использованных.</li>');
                        usedColorsInGroup.push(colorsLinks[node_id]);
                    } else {
                        logPaint.append('<li>Вершина #' + node_id + ' добавлена в очередь на покраску.</li>');
                        queueProcess.push(node_id);
                    }
                }
                colorsLinks[node] = filterColor();
                logPaint.append('<li>Вершине #' + node + ' назначен цвет <span class="js-color-update" data-color="' + colorsLinks[node] + '">' + colorsLinks[node] + '</span></li>');
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


        if (alg) {
            processPaint();
        } else {
            processNodes();
        }

        $('.result_calculate_none').slideUp();
        $('.result_calculate_colors_list').slideDown();
        $('.result_calculate_colors li').remove();
        for (var i = 0; i < colorsStorage.length; i++) {
            $('.result_calculate_colors').append('<li><span class="js-color-update" data-color="' + i + '">' + i + '</span></li>');
        }
        $('.result_calculate_colors_count').text(colorsStorage.length);

        updateAllColors();
    }


    /**
     * Реакция на кнопку "сгенерировать граф"
     */
    $(document).on('submit', 'form.form-generate-graph', function (e) {
        alg = parseInt($("#algo_generate option:selected").val());
        $('.step-color').slideUp();
        stepColor = parseInt($("#color_step option:selected").val());
        stepColorCount = 0;
        generateGraph();
        $(this).find('button').removeClass('btn-primary').addClass('btn-success');
        e.preventDefault();
    });

    $(document).on('click', '.step-color a', function (e) {
        e.preventDefault();
        stepColorCount++;
        processPaint();
        updateAllColors();
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
            $('.form-generate-graph button').removeAttr('disabled');
        } else {
            var errorInfo = '<div class="alert alert-danger" role="alert">Количество должно быть от 0 до 20</div>';
            $(this).find('.form-generate-nodes-count').after(errorInfo);
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
