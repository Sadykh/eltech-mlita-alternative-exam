var width = 960,
    height = 500;

var cola = cola.d3adaptor()
    .size([width, height]);

$(document).ready(function () {
    var graph = {
        "nodes": [],
        "links": []
    };
    var color = d3.scale.category20();
    var svg = d3.select('body')
        .selectAll(".area_graph")
        .append('svg')
        .attr("width", width)
        .attr("height", height);


    function generateLinks() {
        graph.links = [];
        $('.adjacency_matrix_content input:checked').each(function () {
            graph.links.push({
                "source": $(this).data('row'),
                "target": $(this).data('col')
            });
        });
    }

    function generateNodes(count) {
        for (var i = 0; i < count; i++)
            graph.nodes[i] = {"name": i};
        generateLinks();
    }

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


    function generateGraph() {
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
         *
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
        console.log(links);

        var sortList = [];
        for (var i in links) {
            sortList.push([i, links[i].length]);
        }
        sortList.sort(function (a, b) {
            if (a[1] < b[1]) {
                return 1;
            }
            if (a[1] > b[1]) {
                return -1;
            }
            return 0;
        });


        var node = svg.selectAll(".node")
            .data(graph.nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 20)
            .style("fill", function (d) {
                return color(d.index);
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
                    return d.x;
                })
                .attr("y", function (d) {
                    var h = this.getBBox().height;
                    return d.y + h / 4;
                });

        });
    }

    $(document).on('submit', 'form.form-generate-graph', function (e) {
        generateGraph();
        e.preventDefault();
    });
    $(document).on('submit', 'form.form-generate-nodes', function (e) {
        var count = $(this).find('#nodes').val();
        var blockContent = $('.adjacency_matrix_content');
        if (count > 0) {
            generateNodes(count);
            blockContent.html('');
            generateInputs(blockContent, count);
        }
        e.preventDefault();
    });

    $(document).on('change', '.adjacency_matrix_content input[type=checkbox]', function (e) {
        var row = $(this).data('row');
        var col = $(this).data('col');
        $('input[data-col="' + row + '"][data-row="' + col + '"]').prop("checked", this.checked);
        generateLinks();
    });

});
