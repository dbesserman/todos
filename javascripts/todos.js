$(function() {
  var $addForm = $('#create_todo');
  var $modal = $('#edit_todo');
  var $body = $('body');
  var $main = $('main');
  var $sidebar = $('#sidebar');
  var $modalLayer = $('#modal_layer');
  var $todos = $('#todos');
  var lastId = 0;
  var templates = {
    todo: Handlebars.compile($('#todo_template').html()),
    todos: Handlebars.compile($('#todos_template').html()),
    dueMonths: Handlebars.compile($('#due_months_template').html()),
    dueMonth: Handlebars.compile($('#due_month_template').html()),
    editField: Handlebars.compile($('#edit_hidden_field_template').html()),
  };

  Handlebars.registerPartial('todo', $('#todo_template').html());
  Handlebars.registerPartial('dueMonth', $('#due_month_template').html());

  var dateProcessing = {
    parseDateInput: function(day, month, year) {
      if (day && month && year) {
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        return 'No Due Date';
      }
    },
    getShortDate: function(date) {
      if (date.toString() === 'Invalid Date' || date.toString() === 'No Due Date') { return 'No Due Date' }

      var month = (date.getMonth() + 1).toString();
      var year = date.getFullYear().toString();

      year = year.substring(year.length - 2);
      if (month.length === 1) { month = '0' + month }
      return month + '/' + year;
    },
  }

  function getFormObject($f) {
    var o = {};

    $f.serializeArray().forEach(function(input) {
      o[input.name] = input.value;
    });

    return o;
  };

  function not_empty(array) {
    return array.length !== 0;
  };

  var Todo = function(form_obj, completed) {
    this.id = ++lastId;
    this.title = form_obj.title;
    this.date = dateProcessing.parseDateInput(form_obj.day, form_obj.month, form_obj.year);
    this.computedDate = dateProcessing.getShortDate(this.date)
    this.description = form_obj.description;
    this.completed = completed;
  };


  var Todos = {
    collection: [],
    count: function() {
      return this.collection.length;
    },
    findById: function(id) {
      var idx = this.getIndex(id);

      return this.collection[idx];
    },
    createTodo: function(completed, form_obj) {
      var todo = new Todo(form_obj, completed);

      this.collection.push(todo);
    },
    remove: function(id) {
      var idx = this.getIndex(id);

      this.collection.splice(idx, 1);
    },
    editTodo: function(completed, form_obj) {
      var todo = this.findById(parseInt(form_obj.id));

      todo['title'] = form_obj.title;
      todo['date'] = dateProcessing.parseDateInput(form_obj.day, form_obj.month, form_obj.year);
      todo['computedDate'] = dateProcessing.getShortDate(todo['date']); 
      todo['description'] = form_obj.description;
      if (completed) { todo['completed'] = true }
    },
    getIndex: function(id) {
      var idx;

      this.collection.some(function(todo, i) {
        if (todo.id === id) {
          idx = i;
          return true;
        }
      })

      return idx;
    },
    toggleCompletionStatus: function(id) {
      var todo = this.findById(id);

      todo.completed = !todo.completed;
      this.persist();
    },
    persist: function() {
      var collectionStr = JSON.stringify(this.collection);

      localStorage.setItem('collection', collectionStr);
    },
    restore: function() {
      var collection = JSON.parse(localStorage.getItem('collection'));

      this.collection = collection;
    },
    getFilteredCollection: function(date, completed) {
      var collection;

      if (completed) {
        collection = this.filterCompleted(this.collection);
      } else {
        collection = this.collection;
      }

      return collection.filter(function(todo) {
        if (todo.computedDate === date) {
          return true;
        }
      });
    },
    filterCompleted: function(collection) {
      return collection.filter(function(todo) {
        return todo.completed;
      });
    },
    filterUncomplete: function(collection) {
      return collection.filter(function(todo) {
        return !todo.completed;
      });
    },
  };

  var TodosApp = {
    todos: Object.create(Todos),
    init: function() {
      if (localStorage.getItem('collection') || localStorage.getItem('lastId')) { this.restorePeristedData() }

      this.bind();

      return this;
    },
    bind: function() {
      $addForm.on('submit', { edit: false }, this.displayModal.bind(this));
      $body.on('click', '#modal_layer', this.hideModal.bind(this));
      $modal.on('submit', { completed: false }, this.processTodoForm.bind(this));
      $body.on('click', '.delete', this.deleteTodo.bind(this));
      $body.on('click', 'dt span', { edit: true }, this.displayModal.bind(this));
      $body.on('click', 'dt label', this.toggleStatus.bind(this));
      $sidebar.on('click', 'li', this.displaySelectedTodos.bind(this));
      $sidebar.on('click', 'header h2', this.displayAllTodos.bind(this));
      $sidebar.on('click', '#completed h2', this.displayCompletedTodos.bind(this));
      $modal.find('.complete').on('click', { completed: true }, this.processTodoForm.bind(this));
    },
    displayModal: function(e) {
      e.preventDefault();

      this.resetModal();
      if (e.data['edit']) {
        var $dl = $(e.target).closest('dl');
        var id = $dl.data('todo-id');

        this.prepareModalForEdit(id); 
      }
      $modalLayer.show();
      $modal.show();
    },
    resetModal: function() {
      $modal.find('#title').val('');
      $modal.find('#description').val('');
      $modal.find('#day').val('');
      $modal.find('#month').val('');
      $modal.find('#year').val('');
      $('#id_holder').remove();
    },
    prepareModalForEdit: function(id) {
      var todo = this.todos.findById(id);
      var date = new Date (todo.date);
      var day = date.getDate().toString();
      var month = (date.getMonth() + 1).toString();
      var year = date.getFullYear().toString();

      $modal.find('#title').val(todo.title);
      $modal.find('#description').val(todo.description);
      $modal.find('#day').val(day);
      $modal.find('#month').val(month);
      $modal.find('#year').val(year);
      $modal.find('form').append(templates['editField']({id: id}));
    },
    hideModal: function(e) {
      if (e) { e.preventDefault(); }

      $modalLayer.hide();
      $modal.hide();
      this.resetModal();
    },
    processTodoForm: function(e) {
      e.preventDefault();

      var $form = $(e.target).closest('form');
      var form_obj = getFormObject($form);

      if (this.isNewModal()) {
        this.todos.createTodo(e.data.completed, form_obj);
        this.persistLastId();
      } else {
        this.todos.editTodo(e.data.completed, form_obj)
      }

      this.displayAllTodos();
      this.hideModal();
      this.todos.persist();
    },
    isNewModal: function() {
      // the same modal is being used for editig and creating new todos
      // Returns true if the model has been set for a new todo
      return $('#id_holder').length === 0;
    },
    deleteTodo: function(e) {
      e.preventDefault();

      var $target = $(e.target);
      var $todo = $target.closest('dl');
      var id = $todo.data('todo-id');

      $todo.remove();
      this.todos.remove(id);
      this.todos.persist();
      this.displayUpdatedNavbar();
    },
    displayAllTodos: function() {
      var $h2 = $('nav header h2');
      var totalCount = this.todos.count();

      $('.active').removeClass('active'); 
      $h2.addClass('active');
      this.setTitle('All Todos', totalCount);
      this.display(this.todos.collection);
      this.displayUpdatedNavbar();
    },
    displayCompletedTodos: function(e) {
      var $h2 = $(e.target).closest('h2');
      var count = $h2.find('.count').text();
      var completedTodos = this.todos.filterCompleted(this.todos.collection);

      $('.active').removeClass('active'); 
      $h2.addClass('active');
      this.setTitle('Completed', count);
      this.display(completedTodos);
    },
    displaySelectedTodos: function(e) {
      e.preventDefault();

      var $target = $(e.target);
      var $li = $target.closest('li');
      var date = $li.find('time').text();
      var count = $li.find('.count').text();
      var completed = $li.hasClass('completed');
      var filtered_collection = this.todos.getFilteredCollection(date, completed);

      $('.active').removeClass('active'); 
      $li.addClass('active');
      this.setTitle(date, count);
      this.display(filtered_collection);
    },
    setTitle: function(title, count) {
      var $h1 = $('h1'); 

      $h1[0].childNodes[0].nodeValue = title;
      $h1.find('.count').text(count);
    },
    display: function(collection) {
      var self = this;
      var uncompleted = templates['todos']({ todos: self.todos.filterUncomplete(collection) });
      var completed = templates['todos']({ todos: self.todos.filterCompleted(collection) });

      $todos.html(uncompleted + completed);
    },
    displayUpdatedNavbar: function() {
      var $navTotalCount = $('#all_todos .count');
      var $mainTotalCount = $('main .count');
      var $navCompletedCount = $('#completed .count');
      var $navTotalList = $('#all_todos ul');
      var $navCompletedList = $('#completed ul');
      var total = this.todos.count();
      var dueMonths = this.getDueMonthsCount(this.todos.collection);
      var completedTodos = this.todos.filterCompleted(this.todos.collection);
      var completedTotal = completedTodos.length;
      var completedDueMonths = this.getDueMonthsCount(completedTodos, true);

      $navTotalCount.text(total);
      $mainTotalCount.text(total);
      $navCompletedCount.text(completedTotal);

      $navTotalList.html(templates['dueMonths']({ dueMonths: dueMonths }));
      $navCompletedList.html(templates['dueMonths']({ dueMonths: completedDueMonths }));
    },
    toggleStatus: function(e) {
      e.preventDefault();

      var $target = $(e.target);
      var $dl = $target.closest('dl');
      var id = $dl.data('todo-id');

      this.todos.toggleCompletionStatus(id);
      this.displayAllTodos();
    },
    toggleSidebar: function() {
      var status = $sidebar.css('display');
      if (status === 'none') {
        $sidebar.show();
        $main.css('margin-left', '335px');
      } else {
        $sidebar.hide();
        $main.css('margin-left', '0');
      }
    },

    /* filtering a collection */

    getDueMonthsCount: function(collection, completed) {
      var self = this;
      var container = [];
      var dates = collection.map(function(todo) {
        return new Date(todo.date);
      });
      var orderedDates = dates.sort(function(a, b) {
        return a - b;
      });
      var formatedDates = orderedDates.map(function(date) {
        return dateProcessing.getShortDate(date);
      });
      formatedDates.forEach(function(date) {
        var idx;

        if (container.some(function(obj, i) {
          if (obj.date === date) { 
            idx = i;
            return true
          };
        })) {
          container[idx].count++; 
        } else {
          var date_count_obj = {
            date: date,
            count: 1,
            completed: completed,
            display_count: !completed,
          };
          container.push(date_count_obj);
        }
      });

      return container;
    },

    /* Persistence */

    persistLastId: function() {
      localStorage.setItem('lastId', lastId.toString());
    },
    restorePeristedData: function() {
      if (localStorage.getItem('lastId')) {
        lastId = parseInt(localStorage.getItem('lastId'));  
      }

      if (localStorage.getItem('collection')) {
        this.todos.restore();
      }

      this.displayAllTodos();
    },
  }

  Object.create(TodosApp).init();
});
