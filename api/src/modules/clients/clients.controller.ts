import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiAuthErrors, ApiNotFound, ApiValidationErrors } from '../../common/swagger/api.decorators';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

const CLIENT_EXAMPLE = {
  id: '665f1b2c9a4e1c0012ab34cd',
  orgId: '665f1a009a4e1c0012ab1100',
  type: 'foreign',
  name: 'Globex Corporation',
  email: 'ap@globex.com',
  country: 'US',
  createdAt: '2026-06-12T10:00:00.000Z',
};

@ApiTags('Clients')
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiAuthErrors()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'List clients', description: 'Paginated list of clients in the caller\'s organisation.' })
  @ApiOkResponse({
    description: 'Paginated clients',
    schema: {
      example: {
        success: true,
        data: [CLIENT_EXAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    },
  })
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto) {
    return this.clients.list(user.orgId, page);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @ApiOperation({ summary: 'Create a client', description: 'Creates a foreign or domestic client.' })
  @ApiCreatedResponse({ description: 'Client created', schema: { example: { success: true, data: CLIENT_EXAMPLE } } })
  @ApiValidationErrors()
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateClientDto) {
    return this.clients.create(user.orgId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @ApiOperation({ summary: 'Update a client' })
  @ApiParam({ name: 'id', description: 'Client id', example: '665f1b2c9a4e1c0012ab34cd' })
  @ApiOkResponse({ description: 'Client updated', schema: { example: { success: true, data: CLIENT_EXAMPLE } } })
  @ApiValidationErrors()
  @ApiNotFound('Client not found')
  update(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(user.orgId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @ApiOperation({ summary: 'Delete a client' })
  @ApiParam({ name: 'id', description: 'Client id', example: '665f1b2c9a4e1c0012ab34cd' })
  @ApiOkResponse({ description: 'Client deleted', schema: { example: { success: true, data: { deleted: true } } } })
  @ApiNotFound('Client not found')
  remove(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.clients.remove(user.orgId, id);
  }
}
